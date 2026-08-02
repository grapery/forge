package opsagent

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

type LLMConfig struct {
	Provider   string
	APIKey     string
	BaseURL    string
	Model      string
	MaxIter    int
	HTTPClient *http.Client
}

func LoadLLMConfig() LLMConfig {
	provider := env("FORGE_OPS_PROVIDER", env("EINO_TEXT_PROVIDER", "huoshan"))
	model := env("FORGE_OPS_MODEL", env("EINO_TEXT_MODEL", env("HUOSHAN_TEXT_MODEL", "doubao-seed-2-0-lite-260215")))
	base := env("FORGE_OPS_BASE_URL", "")
	key := env("FORGE_OPS_API_KEY", "")
	if provider == "gemini" {
		if key == "" {
			key = env("GEMINI_API_KEY", "")
		}
		if base == "" {
			base = "https://generativelanguage.googleapis.com/v1beta/openai"
		}
		if model == "" || strings.Contains(model, "doubao") {
			model = "gemini-2.0-flash"
		}
	} else {
		if key == "" {
			key = env("HUOSHAN_API_KEY", "")
		}
		if base == "" {
			base = env("HUOSHAN_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3")
		}
	}
	maxIter := 8
	if v := env("FORGE_OPS_MAX_ITERATIONS", ""); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			maxIter = n
		}
	}
	timeout := 120 * time.Second
	if v := env("FORGE_OPS_TIMEOUT", ""); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			timeout = d
		}
	}
	return LLMConfig{
		Provider: provider,
		APIKey:   key,
		BaseURL:  strings.TrimRight(base, "/"),
		Model:    model,
		MaxIter:  maxIter,
		HTTPClient: &http.Client{
			Timeout: timeout,
		},
	}
}

func (c LLMConfig) Enabled() bool {
	return c.APIKey != "" && c.BaseURL != "" && c.Model != ""
}

type chatMessage struct {
	Role       string     `json:"role"`
	Content    string     `json:"content,omitempty"`
	ToolCalls  []toolCall `json:"tool_calls,omitempty"`
	ToolCallID string     `json:"tool_call_id,omitempty"`
	Name       string     `json:"name,omitempty"`
}

type toolCall struct {
	ID       string       `json:"id"`
	Type     string       `json:"type"`
	Function toolCallFn   `json:"function"`
}

type toolCallFn struct {
	Name      string `json:"name"`
	Arguments string `json:"arguments"`
}

type chatRequest struct {
	Model    string           `json:"model"`
	Messages []chatMessage    `json:"messages"`
	Tools    []map[string]any `json:"tools,omitempty"`
}

type chatResponse struct {
	Choices []struct {
		Message chatMessage `json:"message"`
		Finish  string      `json:"finish_reason"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

const systemPrompt = `You are Forge Ops Assistant, a read-only analyst for platform operators.
Use tools to fetch live metrics before answering. Be concise and factual.
Prefer short bullet points. Call out risks (overdue moderation, high AI failure rates) clearly.
Never invent numbers. If a tool fails, say so. Do not perform write actions.`

type EventWriter func(event string, payload any)

// RunChat executes a tool-calling loop and streams SSE-like events via writer.
func RunChat(ctx context.Context, cfg LLMConfig, reg *Registry, caller Caller, userMessage string, history []chatMessage, write EventWriter) error {
	if !cfg.Enabled() {
		write("error", map[string]string{"error": "ops assistant LLM is not configured (set FORGE_OPS_API_KEY / FORGE_OPS_BASE_URL)"})
		write("done", map[string]any{"finished": true, "message": ""})
		return nil
	}

	messages := make([]chatMessage, 0, len(history)+2)
	messages = append(messages, chatMessage{Role: "system", Content: systemPrompt})
	messages = append(messages, history...)
	messages = append(messages, chatMessage{Role: "user", Content: userMessage})

	write("start", map[string]any{"provider": cfg.Provider, "model": cfg.Model})

	tools := reg.OpenAIToolsFor(caller)
	if len(tools) == 0 {
		write("error", map[string]string{"error": "no tools available for your permissions"})
		write("done", map[string]any{"finished": true, "message": ""})
		return nil
	}

	var final string
	for i := 0; i < cfg.MaxIter; i++ {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}
		resp, err := cfg.chat(ctx, messages, tools)
		if err != nil {
			write("error", map[string]string{"error": err.Error()})
			write("done", map[string]any{"finished": true, "message": final})
			return err
		}
		if len(resp.Choices) == 0 {
			write("error", map[string]string{"error": "empty model response"})
			write("done", map[string]any{"finished": true, "message": final})
			return fmt.Errorf("empty model response")
		}
		msg := resp.Choices[0].Message
		if len(msg.ToolCalls) > 0 {
			messages = append(messages, msg)
			for _, tc := range msg.ToolCalls {
				tr := reg.CallFor(ctx, caller, tc.Function.Name, tc.Function.Arguments)
				cite := extractCitation(tr)
				write("tool", map[string]any{
					"name":      tr.Name,
					"input":     tr.Input,
					"output":    truncate(tr.Output, 4000),
					"error":     tr.Error,
					"citation":  cite,
				})
				messages = append(messages, chatMessage{
					Role:       "tool",
					ToolCallID: tc.ID,
					Name:       tc.Function.Name,
					Content:    tr.Output,
				})
			}
			continue
		}
		final = strings.TrimSpace(msg.Content)
		write("message", map[string]any{"message": final, "finished": false})
		write("done", map[string]any{"finished": true, "message": final})
		return nil
	}
	write("error", map[string]string{"error": "max tool iterations reached"})
	write("done", map[string]any{"finished": true, "message": final})
	return fmt.Errorf("max iterations")
}

func extractCitation(tr ToolResult) map[string]any {
	if tr.Error != "" || tr.Output == "" {
		return nil
	}
	var raw any
	if err := json.Unmarshal([]byte(tr.Output), &raw); err != nil {
		return nil
	}
	cite := map[string]any{"tool": tr.Name}
	switch m := raw.(type) {
	case map[string]any:
		keys := []string{
			"totalUsers", "totalStories", "totalOrders", "totalAITasks",
			"activeMemberships", "pendingUserReports", "pendingContentReports", "overdueReportsTotal",
			"overdueTotal", "completedTasks", "failedTasks", "pendingTasks", "totalTasks",
		}
		highlights := map[string]any{}
		for _, k := range keys {
			if v, ok := m[k]; ok {
				highlights[k] = v
			}
		}
		// nested moderation / orders
		if mod, ok := m["moderation"].(map[string]any); ok {
			for _, k := range []string{"pendingUserReports", "pendingContentReports", "overdueTotal"} {
				if v, ok := mod[k]; ok {
					highlights[k] = v
				}
			}
		}
		if len(highlights) > 0 {
			cite["highlights"] = highlights
		}
	}
	return cite
}

func (c LLMConfig) chat(ctx context.Context, messages []chatMessage, tools []map[string]any) (*chatResponse, error) {
	body, err := json.Marshal(chatRequest{
		Model:    c.Model,
		Messages: messages,
		Tools:    tools,
	})
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.BaseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.APIKey)
	res, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	raw, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}
	if res.StatusCode >= 300 {
		return nil, fmt.Errorf("llm http %d: %s", res.StatusCode, truncate(string(raw), 500))
	}
	var out chatResponse
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	if out.Error != nil && out.Error.Message != "" {
		return nil, fmt.Errorf("llm error: %s", out.Error.Message)
	}
	return &out, nil
}

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}
