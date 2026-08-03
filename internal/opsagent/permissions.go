package opsagent

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/grapestree/fgrapery/forge/internal/domain"
)

// Caller is the admin invoking tools (chat or HTTP).
type Caller struct {
	AdminID     string
	Role        string
	Permissions []string
}

func (c Caller) isFullAdmin() bool {
	return domain.IsAdminRole(domain.AdminRole(c.Role))
}

func (c Caller) has(perm string) bool {
	if c.isFullAdmin() {
		return true
	}
	if perm == "" {
		return true
	}
	for _, p := range c.Permissions {
		if p == perm {
			return true
		}
	}
	return false
}

func (c Caller) hasAny(perms ...string) bool {
	if c.isFullAdmin() {
		return true
	}
	for _, p := range perms {
		if c.has(p) {
			return true
		}
	}
	return false
}

// toolAccess returns required permission(s). Empty means any authenticated admin.
func toolAccess(name string) []string {
	switch name {
	case "list_analysis_skills", "get_analysis_skill", "get_dashboard_overview":
		return nil // dashboard-level / meta; overview fields redacted below
	case "get_ai_task_summary":
		return []string{domain.PermAITasks}
	case "list_failed_ai_tasks":
		return []string{domain.PermAITasks}
	case "get_ai_generation_summary":
		return []string{domain.PermAIGenerations}
	case "get_moderation_summary":
		return []string{domain.PermReports}
	case "list_pending_reports":
		return []string{domain.PermReports}
	case "get_feedback_summary":
		return []string{domain.PermFeedback}
	case "list_overdue_feedback":
		return []string{domain.PermFeedback}
	case "get_orders_membership_summary":
		return []string{domain.PermOrders, domain.PermMemberships}
	case "get_token_summary":
		return []string{domain.PermTokens}
	case "get_user_status_counts":
		return []string{domain.PermUsers}
	case "get_content_status_counts":
		return []string{domain.PermContent}
	case "get_share_overview":
		return []string{domain.PermContent}
	case "get_agent_stats":
		return []string{domain.PermAgents}
	case "get_recent_audit":
		return []string{domain.PermAuditLog}
	case "get_search_trends":
		return []string{domain.PermSearch}
	case "create_workflow_draft":
		return []string{domain.PermWorkflowEdit}
	default:
		return []string{"__deny__"}
	}
}

func (c Caller) CanUseTool(name string) bool {
	req := toolAccess(name)
	if len(req) == 0 {
		return true
	}
	if len(req) == 1 && req[0] == "__deny__" {
		return false
	}
	return c.hasAny(req...)
}

func (r *Registry) ListFor(caller Caller) []ToolDef {
	all := r.List()
	out := make([]ToolDef, 0, len(all))
	for _, t := range all {
		if caller.CanUseTool(t.Name) {
			out = append(out, t)
		}
	}
	return out
}

func (r *Registry) OpenAIToolsFor(caller Caller) []map[string]any {
	defs := r.ListFor(caller)
	out := make([]map[string]any, 0, len(defs))
	for _, t := range defs {
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

func (r *Registry) CallFor(ctx context.Context, caller Caller, name, argsJSON string) ToolResult {
	if !caller.CanUseTool(name) {
		return ToolResult{
			Name:   name,
			Input:  argsJSON,
			Error:  "permission denied",
			Output: `{"error":"permission denied"}`,
		}
	}
	res := r.callFor(ctx, caller, name, argsJSON)
	if res.Error == "" && name == "get_dashboard_overview" && !caller.isFullAdmin() {
		res.Output = redactOverview(res.Output, caller)
	}
	if res.Error == "" && name == "get_orders_membership_summary" && !caller.isFullAdmin() {
		res.Output = redactOrdersMembership(res.Output, caller)
	}
	return res
}

func redactOverview(raw string, caller Caller) string {
	var m map[string]any
	if err := json.Unmarshal([]byte(raw), &m); err != nil {
		return raw
	}
	// Strip fields the caller cannot see elsewhere
	if !caller.has(domain.PermOrders) {
		delete(m, "totalOrders")
		delete(m, "totalTokenConsumed")
	}
	if !caller.has(domain.PermTokens) {
		delete(m, "totalTokenTransactions")
		delete(m, "totalTokenConsumed")
	}
	if !caller.has(domain.PermUsers) {
		delete(m, "totalUsers")
	}
	if !caller.has(domain.PermContent) {
		delete(m, "totalStories")
		delete(m, "totalStoryboards")
		delete(m, "totalFragments")
		delete(m, "totalForkEvents")
	}
	if !caller.has(domain.PermCharacters) {
		delete(m, "totalCharacters")
	}
	if !caller.has(domain.PermAITasks) {
		delete(m, "totalAITasks")
	}
	if !caller.has(domain.PermMemberships) {
		delete(m, "activeMemberships")
	}
	if !caller.has(domain.PermReports) {
		delete(m, "pendingUserReports")
		delete(m, "pendingContentReports")
		delete(m, "overdueReportsTotal")
	}
	if !caller.has(domain.PermFeedback) {
		delete(m, "openFeedback")
		delete(m, "overdueFeedback")
		delete(m, "criticalFeedback")
	}
	// Trends: keep only series keys caller can interpret
	if trends, ok := m["trends"].([]any); ok {
		filtered := make([]any, 0, len(trends))
		for _, row := range trends {
			rm, ok := row.(map[string]any)
			if !ok {
				continue
			}
			keep := map[string]any{"date": rm["date"]}
			if caller.has(domain.PermUsers) {
				keep["newUsers"] = rm["newUsers"]
			}
			if caller.has(domain.PermContent) {
				keep["newStories"] = rm["newStories"]
				keep["newFragments"] = rm["newFragments"]
				keep["newStoryboards"] = rm["newStoryboards"]
				keep["forkEvents"] = rm["forkEvents"]
			}
			if caller.has(domain.PermOrders) {
				keep["newOrders"] = rm["newOrders"]
			}
			if caller.has(domain.PermTokens) {
				keep["tokenConsumed"] = rm["tokenConsumed"]
			}
			filtered = append(filtered, keep)
		}
		m["trends"] = filtered
	}
	b, err := json.Marshal(m)
	if err != nil {
		return raw
	}
	return string(b)
}

func redactOrdersMembership(raw string, caller Caller) string {
	var m map[string]any
	if err := json.Unmarshal([]byte(raw), &m); err != nil {
		return raw
	}
	if !caller.has(domain.PermOrders) {
		delete(m, "orders")
	}
	if !caller.has(domain.PermMemberships) {
		delete(m, "memberships")
	}
	b, err := json.Marshal(m)
	if err != nil {
		return raw
	}
	return string(b)
}

// HistoryMessage is the public chat history shape for the HTTP API.
type HistoryMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

func ToChatHistory(msgs []HistoryMessage) []chatMessage {
	out := make([]chatMessage, 0, len(msgs))
	for _, m := range msgs {
		role := strings.ToLower(strings.TrimSpace(m.Role))
		if role != "user" && role != "assistant" {
			continue
		}
		if strings.TrimSpace(m.Content) == "" {
			continue
		}
		out = append(out, chatMessage{Role: role, Content: m.Content})
	}
	// Cap history to keep prompts small
	if len(out) > 20 {
		out = out[len(out)-20:]
	}
	return out
}
