package opsagent

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/service"
)

// ToolDef describes a read-only ops tool shared by chat + MCP.
type ToolDef struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Parameters  json.RawMessage `json:"parameters"`
}

type ToolResult struct {
	Name    string `json:"name"`
	Input   string `json:"input,omitempty"`
	Output  string `json:"output"`
	Error   string `json:"error,omitempty"`
}

type Deps struct {
	Dashboard *service.DashboardService
	AITask    *service.AITaskService
	AIGen     *service.AIGenerationService
	Report    *service.ReportService
	Order     *service.OrderService
	Member    *service.MembershipService
	Token     *service.TokenService
	Audit     *service.AuditLogService
	Search    *service.SearchAnalyticsService
}

type Registry struct {
	deps Deps
}

func NewRegistry(deps Deps) *Registry {
	return &Registry{deps: deps}
}

func (r *Registry) List() []ToolDef {
	emptyObj := json.RawMessage(`{"type":"object","properties":{}}`)
	rangeParams := json.RawMessage(`{"type":"object","properties":{"days":{"type":"integer","description":"Trend window in days: 7, 30, or 90","default":30}},"additionalProperties":false}`)
	limitParams := json.RawMessage(`{"type":"object","properties":{"limit":{"type":"integer","description":"Max items to return","default":10}},"additionalProperties":false}`)
	return []ToolDef{
		{Name: "get_dashboard_overview", Description: "Get platform overview stats including users, stories, orders, tokens, and daily trends.", Parameters: rangeParams},
		{Name: "get_ai_task_summary", Description: "Summarize AI task queue: total, pending, completed, failed.", Parameters: emptyObj},
		{Name: "get_ai_generation_summary", Description: "Summarize AI generations volume and status.", Parameters: emptyObj},
		{Name: "get_moderation_summary", Description: "Get moderation backlog: pending user/content reports, overdue total, and block counts.", Parameters: emptyObj},
		{Name: "get_orders_membership_summary", Description: "Summarize orders and active memberships.", Parameters: emptyObj},
		{Name: "get_token_summary", Description: "Summarize token economy transactions and consumption.", Parameters: emptyObj},
		{Name: "get_recent_audit", Description: "List recent admin audit log entries.", Parameters: limitParams},
		{Name: "get_search_trends", Description: "Get top search query trends.", Parameters: limitParams},
	}
}

func (r *Registry) OpenAITools() []map[string]any {
	out := make([]map[string]any, 0, len(r.List()))
	for _, t := range r.List() {
		var params any
		_ = json.Unmarshal(t.Parameters, &params)
		out = append(out, map[string]any{
			"type": "function",
			"function": map[string]any{
				"name":        t.Name,
				"description": t.Description,
				"parameters":   params,
			},
		})
	}
	return out
}

func (r *Registry) Call(ctx context.Context, name, argsJSON string) ToolResult {
	_ = ctx
	res := ToolResult{Name: name, Input: argsJSON}
	out, err := r.call(name, argsJSON)
	if err != nil {
		res.Error = err.Error()
		res.Output = fmt.Sprintf(`{"error":%q}`, err.Error())
		return res
	}
	res.Output = out
	return res
}

func (r *Registry) call(name, argsJSON string) (string, error) {
	args := map[string]any{}
	if argsJSON != "" && argsJSON != "{}" {
		if err := json.Unmarshal([]byte(argsJSON), &args); err != nil {
			return "", fmt.Errorf("invalid args: %w", err)
		}
	}
	switch name {
	case "get_dashboard_overview":
		days := intFrom(args, "days", 30)
		if days != 7 && days != 30 && days != 90 {
			days = 30
		}
		stats, err := r.deps.Dashboard.GetOverview(days)
		if err != nil {
			return "", err
		}
		return marshal(stats)
	case "get_ai_task_summary":
		s, err := r.deps.AITask.Summary()
		if err != nil {
			return "", err
		}
		return marshal(s)
	case "get_ai_generation_summary":
		s, err := r.deps.AIGen.Summary()
		if err != nil {
			return "", err
		}
		return marshal(s)
	case "get_moderation_summary":
		mod, err := r.deps.Report.ModerationSummary()
		if err != nil {
			return "", err
		}
		blocks, _ := r.deps.Report.BlockCounts()
		payload := map[string]any{"moderation": mod, "blocks": blocks}
		return marshal(payload)
	case "get_orders_membership_summary":
		orders, err := r.deps.Order.Summary()
		if err != nil {
			return "", err
		}
		members, err := r.deps.Member.Summary()
		if err != nil {
			return "", err
		}
		return marshal(map[string]any{"orders": orders, "memberships": members})
	case "get_token_summary":
		s, err := r.deps.Token.Summary()
		if err != nil {
			return "", err
		}
		return marshal(s)
	case "get_recent_audit":
		limit := intFrom(args, "limit", 10)
		if limit <= 0 || limit > 50 {
			limit = 10
		}
		items, _, err := r.deps.Audit.List(&domain.OperationLogQuery{Page: 1, PageSize: limit})
		if err != nil {
			return "", err
		}
		return marshal(items)
	case "get_search_trends":
		limit := intFrom(args, "limit", 10)
		if limit <= 0 || limit > 50 {
			limit = 10
		}
		trends, err := r.deps.Search.GetTrends(limit)
		if err != nil {
			return "", err
		}
		return marshal(trends)
	default:
		return "", fmt.Errorf("unknown tool: %s", name)
	}
}

func intFrom(args map[string]any, key string, def int) int {
	v, ok := args[key]
	if !ok {
		return def
	}
	switch n := v.(type) {
	case float64:
		return int(n)
	case int:
		return n
	case json.Number:
		i, _ := n.Int64()
		return int(i)
	default:
		return def
	}
}

func marshal(v any) (string, error) {
	b, err := json.Marshal(v)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

// ConfiguredAt is a small helper for status endpoint.
func NowISO() string {
	return time.Now().UTC().Format(time.RFC3339)
}
