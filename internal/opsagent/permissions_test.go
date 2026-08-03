package opsagent

import "testing"

func TestCallerToolAccess(t *testing.T) {
	admin := Caller{Role: "admin"}
	if !admin.CanUseTool("get_recent_audit") {
		t.Fatal("admin should use audit tool")
	}

	viewer := Caller{Role: "viewer", Permissions: []string{"feedback"}}
	if viewer.CanUseTool("get_recent_audit") {
		t.Fatal("viewer without audit-log must not use audit tool")
	}
	if !viewer.CanUseTool("get_dashboard_overview") {
		t.Fatal("viewer should use dashboard overview")
	}
	if viewer.CanUseTool("get_token_summary") {
		t.Fatal("viewer without tokens must not use token tool")
	}
	if !viewer.CanUseTool("get_feedback_summary") {
		t.Fatal("viewer with feedback should use feedback summary")
	}
	if !viewer.CanUseTool("list_analysis_skills") {
		t.Fatal("viewer should list analysis skills")
	}

	op := Caller{Role: "operator", Permissions: []string{"reports", "orders"}}
	if !op.CanUseTool("get_moderation_summary") {
		t.Fatal("operator with reports should use moderation")
	}
	if !op.CanUseTool("get_orders_membership_summary") {
		t.Fatal("operator with orders should use orders/membership summary")
	}
	if op.CanUseTool("get_ai_task_summary") {
		t.Fatal("operator without ai-tasks must not use ai task tool")
	}
	if op.CanUseTool("create_workflow_draft") {
		t.Fatal("operator without workflow-edit must not create workflow drafts")
	}
	op.Permissions = append(op.Permissions, "workflow-edit")
	if !op.CanUseTool("create_workflow_draft") {
		t.Fatal("operator with workflow-edit should create workflow drafts")
	}
}

func TestRedactOverview(t *testing.T) {
	raw := `{"totalUsers":10,"totalOrders":3,"pendingUserReports":1,"trends":[{"date":"2026-01-01","newUsers":1,"newOrders":2}]}`
	out := redactOverview(raw, Caller{Role: "viewer", Permissions: []string{"users"}})
	if contains(out, "totalOrders") || contains(out, "pendingUserReports") {
		t.Fatalf("expected redaction, got %s", out)
	}
	if !contains(out, "totalUsers") {
		t.Fatalf("expected users kept, got %s", out)
	}
}

func contains(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || len(sub) == 0 || indexOf(s, sub) >= 0)
}

func indexOf(s, sub string) int {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}
