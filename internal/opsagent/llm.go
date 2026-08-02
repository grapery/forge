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
	Thinking   bool // DeepSeek V4 thinking mode; requires reasoning_content round-trip with tools
	HTTPClient *http.Client
}

func LoadLLMConfig() LLMConfig {
	provider := strings.ToLower(env("FORGE_OPS_PROVIDER", "deepseek"))
	model := env("FORGE_OPS_MODEL", "")
	base := env("FORGE_OPS_BASE_URL", "")
	key := env("FORGE_OPS_API_KEY", "")
	thinking := envBool("FORGE_OPS_THINKING", false)

	switch provider {
	case "gemini":
		if key == "" {
			key = env("GEMINI_API_KEY", "")
		}
		if base == "" {
			base = "https://generativelanguage.googleapis.com/v1beta/openai"
		}
		if model == "" || strings.Contains(model, "doubao") || strings.Contains(model, "deepseek") {
			model = "gemini-2.0-flash"
		}
	case "huoshan", "ark", "doubao":
		provider = "huoshan"
		if key == "" {
			key = env("HUOSHAN_API_KEY", "")
		}
		if base == "" {
			base = env("HUOSHAN_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3")
		}
		if model == "" {
			model = env("EINO_TEXT_MODEL", env("HUOSHAN_TEXT_MODEL", "doubao-seed-2-0-lite-260215"))
		}
	default: // deepseek
		provider = "deepseek"
		if key == "" {
			key = env("DEEPSEEK_API_KEY", "")
		}
		if base == "" {
			// OpenAI-compatible BASE URL per https://api-docs.deepseek.com/zh-cn/quick_start/pricing
			base = env("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
		}
		if model == "" || strings.Contains(model, "doubao") || strings.Contains(model, "gemini") {
			// V4 flash: tool calls + lower cost; pro also supported via FORGE_OPS_MODEL
			model = "deepseek-v4-flash"
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
		Thinking: thinking && provider == "deepseek",
		HTTPClient: &http.Client{
			Timeout: timeout,
		},
	}
}

func (c LLMConfig) Enabled() bool {
	return c.APIKey != "" && c.BaseURL != "" && c.Model != ""
}

type chatMessage struct {
	Role             string     `json:"role"`
	Content          string     `json:"content,omitempty"`
	ReasoningContent string     `json:"reasoning_content,omitempty"`
	ToolCalls        []toolCall `json:"tool_calls,omitempty"`
	ToolCallID       string     `json:"tool_call_id,omitempty"`
	Name             string     `json:"name,omitempty"`
}

type toolCall struct {
	ID       string     `json:"id"`
	Type     string     `json:"type"`
	Function toolCallFn `json:"function"`
}

type toolCallFn struct {
	Name      string `json:"name"`
	Arguments string `json:"arguments"`
}

type chatRequest struct {
	Model    string           `json:"model"`
	Messages []chatMessage    `json:"messages"`
	Tools    []map[string]any `json:"tools,omitempty"`
	// DeepSeek V4 OpenAI-compatible thinking switch.
	// Default disabled for reliable ops tool loops; set FORGE_OPS_THINKING=1 to enable.
	Thinking *thinkingOpt `json:"thinking,omitempty"`
}

type thinkingOpt struct {
	Type string `json:"type"` // enabled | disabled
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
Prefer short bullet points. Call out risks (overdue moderation/feedback, high AI failure rates, revenue anomalies) clearly.
Never invent numbers. If a tool fails, say so. Do not perform write actions.
When a user asks for a domain review, prefer the matching analysis skill playbook and its SuggestedTools.
You can call list_analysis_skills or get_analysis_skill to load a playbook.`

type EventWriter func(event string, payload any)

func buildSystemPrompt(skillID string) string {
	var b strings.Builder
	b.WriteString(systemPrompt)
	b.WriteString("\n\n")
	b.WriteString(skillsCatalogPrompt())
	if skillID != "" {
		if s := GetAnalysisSkill(skillID); s != nil {
			b.WriteString("\n")
			b.WriteString(s.promptBlock())
			b.WriteString("\n")
		}
	}
	return b.String()
}

// RunChat executes a tool-calling loop and streams SSE-like events via writer.
// skillID optionally activates an analysis playbook in the system prompt.
func RunChat(ctx context.Context, cfg LLMConfig, reg *Registry, caller Caller, userMessage string, history []chatMessage, write EventWriter, skillID string) error {
	if !cfg.Enabled() {
		write("error", map[string]string{"error": "ops assistant LLM is not configured (set FORGE_OPS_API_KEY)"})
		write("done", map[string]any{"finished": true, "message": ""})
		return nil
	}

	messages := make([]chatMessage, 0, len(history)+2)
	messages = append(messages, chatMessage{Role: "system", Content: buildSystemPrompt(skillID)})
	messages = append(messages, history...)
	messages = append(messages, chatMessage{Role: "user", Content: userMessage})

	startPayload := map[string]any{"provider": cfg.Provider, "model": cfg.Model, "thinking": cfg.Thinking}
	if skillID != "" {
		startPayload["skillId"] = skillID
	}
	write("start", startPayload)

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
			// DeepSeek thinking + tools requires full assistant message (incl. reasoning_content) round-trip.
			messages = append(messages, msg)
			for _, tc := range msg.ToolCalls {
				tr := reg.CallFor(ctx, caller, tc.Function.Name, tc.Function.Arguments)
				cite := extractCitation(tr)
				write("tool", map[string]any{
					"name":     tr.Name,
					"input":    tr.Input,
					"output":   truncate(tr.Output, 4000),
					"error":    tr.Error,
					"citation": cite,
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
			"received", "processing", "resolved", "closed", "overdue", "critical",
			"totalIssues", "totalOpens", "openRate", "issuesToday", "opensToday",
			"active", "suspended", "deleted", "total", "published", "draft",
			"totalAgents", "activeAgents", "totalSkills", "totalInteractions",
			"totalConsumed", "totalRecharged", "totalRefunded", "totalGifted",
			"totalRevenue", "pendingCount", "completedCount", "refundedCount",
			"freeCount", "basicCount", "proCount", "premiumCount", "totalActive",
		}
		highlights := map[string]any{}
		for _, k := range keys {
			if v, ok := m[k]; ok {
				highlights[k] = v
			}
		}
		if mod, ok := m["moderation"].(map[string]any); ok {
			for _, k := range []string{"pendingUserReports", "pendingContentReports", "overdueTotal"} {
				if v, ok := mod[k]; ok {
					highlights[k] = v
				}
			}
		}
		if orders, ok := m["orders"].(map[string]any); ok {
			for _, k := range []string{"totalOrders", "totalRevenue", "pendingCount", "completedCount", "refundedCount"} {
				if v, ok := orders[k]; ok {
					highlights[k] = v
				}
			}
		}
		if members, ok := m["memberships"].(map[string]any); ok {
			for _, k := range []string{"freeCount", "basicCount", "proCount", "premiumCount", "totalActive"} {
				if v, ok := members[k]; ok {
					highlights[k] = v
				}
			}
		}
		if counts, ok := m["counts"].(map[string]any); ok {
			for _, k := range []string{"total", "published", "draft", "other"} {
				if v, ok := counts[k]; ok {
					highlights[k] = v
				}
			}
		}
		if ur, ok := m["userReports"].(map[string]any); ok {
			if v, ok := ur["total"]; ok {
				highlights["pendingUserReportsListed"] = v
			}
		}
		if cr, ok := m["contentReports"].(map[string]any); ok {
			if v, ok := cr["total"]; ok {
				highlights["pendingContentReportsListed"] = v
			}
		}
		if len(highlights) > 0 {
			cite["highlights"] = highlights
		}
	}
	return cite
}

func (c LLMConfig) chat(ctx context.Context, messages []chatMessage, tools []map[string]any) (*chatResponse, error) {
	reqBody := chatRequest{
		Model:    c.Model,
		Messages: messages,
		Tools:    tools,
	}
	if c.Provider == "deepseek" {
		typ := "disabled"
		if c.Thinking {
			typ = "enabled"
		}
		reqBody.Thinking = &thinkingOpt{Type: typ}
	}
	body, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.chatCompletionsURL(), bytes.NewReader(body))
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

func (c LLMConfig) chatCompletionsURL() string {
	base := strings.TrimRight(c.BaseURL, "/")
	// Accept either https://api.deepseek.com or .../v1
	if strings.HasSuffix(base, "/v1") {
		return base + "/chat/completions"
	}
	return base + "/chat/completions"
}

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func envBool(k string, def bool) bool {
	v := strings.TrimSpace(strings.ToLower(os.Getenv(k)))
	if v == "" {
		return def
	}
	return v == "1" || v == "true" || v == "yes" || v == "on"
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}
