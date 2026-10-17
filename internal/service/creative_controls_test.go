package service

import (
	"context"
	"encoding/json"
	"github.com/grapestree/fgrapery/forge/internal/config"
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestWorkflowCreateAndUpdateRejectInvalidControlsBeforePersistence(t *testing.T) {
	service := NewWorkflowService(nil, nil, nil, nil)
	invalid := map[string]any{"creativeControls": map[string]any{"permissions": "anyone"}}
	def := domain.WorkflowDefinition{Nodes: []domain.WorkflowNode{{ID: "generate", Type: "activity", Activity: "legacy.fragment.generate"}}}
	if _, err := service.CreateDraft(&domain.CreateWorkflowDraftRequest{Key: "demo", Name: "Demo", Manifest: invalid, Definition: def}, "operator"); err == nil {
		t.Fatal("create accepted system override")
	}
	if _, err := service.UpdateDraft("draft", &domain.UpdateWorkflowDraftRequest{Name: "Demo", Manifest: invalid, Definition: def}, "operator"); err == nil {
		t.Fatal("update accepted system override")
	}
}
func TestWorkflowPublisherValidatesControlsAndPreservesReleaseEnvelope(t *testing.T) {
	calls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		var release domain.WorkflowRelease
		if err := json.NewDecoder(r.Body).Decode(&release); err != nil {
			t.Fatal(err)
		}
		controls, err := domain.ParseCreativeControls(release.Manifest["creativeControls"])
		if err != nil || controls.Pacing != "fast" || release.Version != 7 || len(release.ApprovedBy) != 1 {
			t.Fatal("release controls/version/review lost", err)
		}
		release.Checksum = "runtime-checksum"
		_ = json.NewEncoder(w).Encode(map[string]any{"code": 1, "data": release})
	}))
	defer server.Close()
	publisher := NewGraperyWorkflowPublisher(config.WorkflowRuntimeConfig{BaseURL: server.URL, InternalAPIKey: "local-test-key"})
	if _, err := publisher.PublishRelease(context.Background(), &domain.WorkflowRelease{ID: "bad", Manifest: map[string]any{"creativeControls": map[string]any{"jsonSchema": "override"}}}); err == nil || calls != 0 {
		t.Fatal("invalid release reached runtime")
	}
	release, err := publisher.PublishRelease(context.Background(), &domain.WorkflowRelease{ID: "version-7", Version: 7, ApprovedBy: []string{"reviewer"}, Manifest: map[string]any{"creativeControls": map[string]any{"pacing": "fast"}}})
	if err != nil || release.Checksum != "runtime-checksum" || calls != 1 {
		t.Fatal("normal version/checksum path changed", err)
	}
}
func TestWorkflowPlannerConfigurationCannotOverrideCoreInput(t *testing.T) {
	node := domain.WorkflowNode{ID: "plan_generation", Type: "activity", Activity: "ai.runtime.plan", Config: map[string]any{"inputPatchAllowlist": []string{"sceneCount", "acceptanceChecks"}}}
	if err := validateForgeNodeConfig(node); err != nil {
		t.Fatal(err)
	}
	node.Config["inputPatchAllowlist"] = []string{"userId"}
	if validateForgeNodeConfig(node) == nil {
		t.Fatal("identity added to planner overrides")
	}
	node.Config = map[string]any{"inputDefaults": map[string]any{"workflowSystemPrompt": "override"}}
	if validateForgeNodeConfig(node) == nil {
		t.Fatal("core prompt override accepted")
	}
}
