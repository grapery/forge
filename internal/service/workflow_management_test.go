package service

import (
	"testing"

	"github.com/grapestree/fgrapery/forge/internal/domain"
)

func TestValidateForgeWorkflow(t *testing.T) {
	definition := domain.WorkflowDefinition{Nodes: []domain.WorkflowNode{
		{ID: "load", Type: "activity", Activity: "context.load_story"},
		{ID: "persist", Type: "persist", Activity: "storyboard.persist", DependsOn: []string{"load"}},
	}}
	if err := validateForgeWorkflow(definition, domain.WorkflowPolicies{MaxDurationSeconds: 43200, MaxParallelism: 4, MaxAttempts: 3}); err != nil {
		t.Fatalf("valid workflow rejected: %v", err)
	}
	definition.Nodes[0].DependsOn = []string{"persist"}
	if err := validateForgeWorkflow(definition, domain.WorkflowPolicies{}); err == nil {
		t.Fatal("expected cycle error")
	}
}

func TestValidateForgePromptBundleRejectsUnknownNode(t *testing.T) {
	definition := domain.WorkflowDefinition{Nodes: []domain.WorkflowNode{{ID: "generate", Type: "activity", Activity: "legacy.storyboard.generate"}}}
	if err := validateForgePromptBundle(definition, map[string]string{"generate": "ptv_1"}); err != nil {
		t.Fatalf("valid prompt bundle rejected: %v", err)
	}
	if err := validateForgePromptBundle(definition, map[string]string{"generate:scene_plan": "ptv_2"}); err != nil {
		t.Fatalf("valid prompt slot rejected: %v", err)
	}
	if err := validateForgePromptBundle(definition, map[string]string{"generate:": "ptv_2"}); err == nil {
		t.Fatal("expected empty prompt slot to be rejected")
	}
	if err := validateForgePromptBundle(definition, map[string]string{"missing": "ptv_1"}); err == nil {
		t.Fatal("expected unknown prompt bundle node to be rejected")
	}
}

func TestWorkflowDraftCloneRequestCopiesExecutableConfigurationOnly(t *testing.T) {
	source := &domain.WorkflowDraft{
		ID: "wfd_v1", Key: "storyboard_generation", Version: 1, Revision: 7,
		Status: domain.WorkflowDraftStatusReleased, ReleaseID: "wfr_v1", ReleaseChecksum: "checksum",
		Name: "Storyboard", Description: "released workflow",
		Definition:   domain.WorkflowDefinition{Nodes: []domain.WorkflowNode{{ID: "draft", Type: "activity", Activity: "storyboard.ensure_draft"}}},
		PromptBundle: map[string]string{"draft": "ptv_1"}, Policies: domain.WorkflowPolicies{MaxAttempts: 3},
	}
	req := workflowDraftCloneRequest(source)
	if req.Key != source.Key || req.Name != source.Name || req.Definition.Nodes[0].Activity != "storyboard.ensure_draft" || req.PromptBundle["draft"] != "ptv_1" || req.Policies.MaxAttempts != 3 {
		t.Fatalf("clone request lost executable configuration: %+v", req)
	}
}

func TestStableWorkflowBindingIDSupportsUpgradeAndRollback(t *testing.T) {
	base := &domain.WorkflowBinding{Surface: "voyager.storyboard", Action: "generate", WorkflowKey: "storyboard_generation", ReleaseID: "wfr_v1", Priority: 100}
	upgraded := *base
	upgraded.ReleaseID = "wfr_v2"
	if stableWorkflowBindingID(base) != stableWorkflowBindingID(&upgraded) {
		t.Fatal("release upgrades must update the same logical binding")
	}
	tenant := upgraded
	tenant.TenantID = "tenant_1"
	if stableWorkflowBindingID(base) == stableWorkflowBindingID(&tenant) {
		t.Fatal("tenant-specific binding must have a distinct identity")
	}
	lowerPriority := upgraded
	lowerPriority.Priority = 50
	if stableWorkflowBindingID(base) == stableWorkflowBindingID(&lowerPriority) {
		t.Fatal("parallel priority slots must have distinct identities")
	}
}
