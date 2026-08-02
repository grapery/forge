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
	Name   string `json:"name"`
	Input  string `json:"input,omitempty"`
	Output string `json:"output"`
	Error  string `json:"error,omitempty"`
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
	Feedback  *service.FeedbackService
	Share     *service.ShareAnalyticsService
	Agent     *service.AgentService
	User      *service.UserService
	Content   *service.ContentService
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
	skillParams := json.RawMessage(`{"type":"object","properties":{"id":{"type":"string","description":"Skill id, e.g. growth, ai_health, moderation, revenue, growth_share, audit_security"}},"required":["id"],"additionalProperties":false}`)
	contentParams := json.RawMessage(`{"type":"object","properties":{"contentType":{"type":"string","description":"Optional: story | storyboard | fragment. Empty returns story counts.","default":"story"}},"additionalProperties":false}`)
	triageParams := json.RawMessage(`{"type":"object","properties":{"limit":{"type":"integer","description":"Max items (1-20)","default":10},"overdueOnly":{"type":"boolean","description":"For reports: only overdue pending items","default":false}},"additionalProperties":false}`)
	return []ToolDef{
		{Name: "list_analysis_skills", Description: "List available ops analysis skills (business process + how-to-analyze playbooks).", Parameters: emptyObj},
		{Name: "get_analysis_skill", Description: "Get one analysis skill playbook by id for structured investigation.", Parameters: skillParams},
		{Name: "get_dashboard_overview", Description: "Get platform overview stats including users, stories, orders, tokens, and daily trends.", Parameters: rangeParams},
		{Name: "get_ai_task_summary", Description: "Summarize AI task queue: total, pending, completed, failed.", Parameters: emptyObj},
		{Name: "list_failed_ai_tasks", Description: "List recent failed AI tasks for triage (id, type, provider, error, related entity).", Parameters: limitParams},
		{Name: "get_ai_generation_summary", Description: "Summarize AI generations volume and status.", Parameters: emptyObj},
		{Name: "get_moderation_summary", Description: "Get moderation backlog: pending user/content reports, overdue total, and block counts.", Parameters: emptyObj},
		{Name: "list_pending_reports", Description: "List pending user and content reports for moderation triage. Optional overdueOnly=true.", Parameters: triageParams},
		{Name: "get_feedback_summary", Description: "Summarize user feedback queue: received/processing/resolved/closed plus overdue and critical counts.", Parameters: emptyObj},
		{Name: "list_overdue_feedback", Description: "List overdue open feedback items past the 24h first-touch SLA.", Parameters: limitParams},
		{Name: "get_orders_membership_summary", Description: "Summarize orders and active memberships.", Parameters: emptyObj},
		{Name: "get_token_summary", Description: "Summarize token economy transactions and consumption.", Parameters: emptyObj},
		{Name: "get_user_status_counts", Description: "Get user status distribution: active, suspended, deleted.", Parameters: emptyObj},
		{Name: "get_content_status_counts", Description: "Get content status counts for story/storyboard/fragment.", Parameters: contentParams},
		{Name: "get_share_overview", Description: "Get share funnel overview: issues, opens, open rate, by kind, daily trend.", Parameters: rangeParams},
		{Name: "get_agent_stats", Description: "Summarize in-product agents: total, active, skills, interactions.", Parameters: emptyObj},
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
	case "list_analysis_skills":
		return marshal(ListAnalysisSkills())
	case "get_analysis_skill":
		id, _ := args["id"].(string)
		s := GetAnalysisSkill(id)
		if s == nil {
			return "", fmt.Errorf("unknown skill id: %s", id)
		}
		return marshal(s)
	case "get_dashboard_overview":
		if r.deps.Dashboard == nil {
			return "", fmt.Errorf("dashboard service unavailable")
		}
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
		if r.deps.AITask == nil {
			return "", fmt.Errorf("ai task service unavailable")
		}
		s, err := r.deps.AITask.Summary()
		if err != nil {
			return "", err
		}
		return marshal(s)
	case "list_failed_ai_tasks":
		if r.deps.AITask == nil {
			return "", fmt.Errorf("ai task service unavailable")
		}
		limit := clampLimit(intFrom(args, "limit", 10), 10, 20)
		items, total, err := r.deps.AITask.List(&domain.AITaskListQuery{Page: 1, PageSize: limit, Status: "failed"})
		if err != nil {
			return "", err
		}
		rows := make([]map[string]any, 0, len(items))
		for _, it := range items {
			rows = append(rows, map[string]any{
				"id": it.ID, "type": it.Type, "provider": it.Provider, "model": it.Model,
				"userId": it.UserID, "userName": it.UserName, "errorMessage": truncateRunes(it.Error, 240),
				"relatedEntityType": it.RelatedEntityType, "relatedEntityId": it.RelatedEntityID,
				"createdAt": it.CreatedAt,
			})
		}
		return marshal(map[string]any{"total": total, "items": rows})
	case "get_ai_generation_summary":
		if r.deps.AIGen == nil {
			return "", fmt.Errorf("ai generation service unavailable")
		}
		s, err := r.deps.AIGen.Summary()
		if err != nil {
			return "", err
		}
		return marshal(s)
	case "get_moderation_summary":
		if r.deps.Report == nil {
			return "", fmt.Errorf("report service unavailable")
		}
		mod, err := r.deps.Report.ModerationSummary()
		if err != nil {
			return "", err
		}
		blocks, _ := r.deps.Report.BlockCounts()
		return marshal(map[string]any{"moderation": mod, "blocks": blocks})
	case "list_pending_reports":
		if r.deps.Report == nil {
			return "", fmt.Errorf("report service unavailable")
		}
		limit := clampLimit(intFrom(args, "limit", 10), 10, 20)
		overdueOnly := boolFrom(args, "overdueOnly", false)
		userItems, userTotal, err := r.deps.Report.List(&domain.ReportListQuery{
			Page: 1, PageSize: limit, Status: "pending", Overdue: overdueOnly,
		})
		if err != nil {
			return "", err
		}
		contentItems, contentTotal, err := r.deps.Report.ListContentReports(&domain.ContentReportListQuery{
			Page: 1, PageSize: limit, Status: "pending", Overdue: overdueOnly,
		})
		if err != nil {
			return "", err
		}
		users := make([]map[string]any, 0, len(userItems))
		for _, it := range userItems {
			users = append(users, map[string]any{
				"id": it.ID, "reason": truncateRunes(it.Reason, 160), "isOverdue": it.IsOverdue,
				"reporterName": it.ReporterName, "reportedName": it.ReportedName, "createdAt": it.CreatedAt,
			})
		}
		contents := make([]map[string]any, 0, len(contentItems))
		for _, it := range contentItems {
			contents = append(contents, map[string]any{
				"id": it.ID, "contentType": it.ContentType, "contentId": it.ContentID,
				"reason": truncateRunes(it.Reason, 160), "isOverdue": it.IsOverdue,
				"reporterName": it.ReporterName, "contentTitle": it.ContentTitle, "createdAt": it.CreatedAt,
			})
		}
		return marshal(map[string]any{
			"overdueOnly": overdueOnly,
			"userReports": map[string]any{"total": userTotal, "items": users},
			"contentReports": map[string]any{"total": contentTotal, "items": contents},
		})
	case "get_feedback_summary":
		if r.deps.Feedback == nil {
			return "", fmt.Errorf("feedback service unavailable")
		}
		s, err := r.deps.Feedback.StatusCounts()
		if err != nil {
			return "", err
		}
		return marshal(s)
	case "list_overdue_feedback":
		if r.deps.Feedback == nil {
			return "", fmt.Errorf("feedback service unavailable")
		}
		limit := clampLimit(intFrom(args, "limit", 10), 10, 20)
		items, total, err := r.deps.Feedback.List(&domain.FeedbackListQuery{
			Page: 1, PageSize: limit, Overdue: true,
		})
		if err != nil {
			return "", err
		}
		rows := make([]map[string]any, 0, len(items))
		for _, it := range items {
			rows = append(rows, map[string]any{
				"id": it.ID, "category": it.Category, "status": it.Status,
				"userId": it.UserID, "userName": it.UserName,
				"content": truncateRunes(it.Content, 200), "createdAt": it.CreatedAt,
			})
		}
		return marshal(map[string]any{"total": total, "items": rows})
	case "get_orders_membership_summary":
		if r.deps.Order == nil || r.deps.Member == nil {
			return "", fmt.Errorf("order/membership service unavailable")
		}
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
		if r.deps.Token == nil {
			return "", fmt.Errorf("token service unavailable")
		}
		s, err := r.deps.Token.Summary()
		if err != nil {
			return "", err
		}
		return marshal(s)
	case "get_user_status_counts":
		if r.deps.User == nil {
			return "", fmt.Errorf("user service unavailable")
		}
		s, err := r.deps.User.StatusCounts()
		if err != nil {
			return "", err
		}
		return marshal(s)
	case "get_content_status_counts":
		if r.deps.Content == nil {
			return "", fmt.Errorf("content service unavailable")
		}
		ct, _ := args["contentType"].(string)
		if ct == "" {
			ct = "story"
		}
		s, err := r.deps.Content.StatusCounts(ct)
		if err != nil {
			return "", err
		}
		return marshal(map[string]any{"contentType": ct, "counts": s})
	case "get_share_overview":
		if r.deps.Share == nil {
			return "", fmt.Errorf("share service unavailable")
		}
		days := intFrom(args, "days", 30)
		if days != 7 && days != 30 && days != 90 {
			days = 30
		}
		s, err := r.deps.Share.Overview(days)
		if err != nil {
			return "", err
		}
		return marshal(s)
	case "get_agent_stats":
		if r.deps.Agent == nil {
			return "", fmt.Errorf("agent service unavailable")
		}
		s, err := r.deps.Agent.Stats()
		if err != nil {
			return "", err
		}
		return marshal(s)
	case "get_recent_audit":
		if r.deps.Audit == nil {
			return "", fmt.Errorf("audit service unavailable")
		}
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
		if r.deps.Search == nil {
			return "", fmt.Errorf("search service unavailable")
		}
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

func boolFrom(args map[string]any, key string, def bool) bool {
	v, ok := args[key]
	if !ok {
		return def
	}
	b, ok := v.(bool)
	if !ok {
		return def
	}
	return b
}

func clampLimit(n, def, max int) int {
	if n <= 0 {
		return def
	}
	if n > max {
		return max
	}
	return n
}

func truncateRunes(s string, max int) string {
	if max <= 0 {
		return s
	}
	r := []rune(s)
	if len(r) <= max {
		return s
	}
	return string(r[:max]) + "…"
}

func marshal(v any) (string, error) {
	b, err := json.Marshal(v)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

// NowISO is a small helper for status endpoint.
func NowISO() string {
	return time.Now().UTC().Format(time.RFC3339)
}
