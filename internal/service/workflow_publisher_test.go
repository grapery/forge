package service

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/grapestree/fgrapery/forge/internal/config"
	"github.com/grapestree/fgrapery/forge/internal/domain"
)

func TestGraperyWorkflowPublisherUsesInternalAuthentication(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPut {
			t.Fatalf("method: %s", r.Method)
		}
		if r.Header.Get("X-Internal-Api-Key") != "test-key" {
			t.Fatal("missing internal api key")
		}
		if strings.Contains(r.URL.Path, "/prompt-versions/") {
			var prompt domain.PromptTemplateVersion
			if err := json.NewDecoder(r.Body).Decode(&prompt); err != nil {
				t.Fatal(err)
			}
			prompt.Checksum = "prompt-checksum"
			_ = json.NewEncoder(w).Encode(map[string]any{"code": 1, "message": "success", "data": prompt})
			return
		}
		var release domain.WorkflowRelease
		if err := json.NewDecoder(r.Body).Decode(&release); err != nil {
			t.Fatal(err)
		}
		release.Checksum = "server-checksum"
		_ = json.NewEncoder(w).Encode(map[string]any{"code": 1, "message": "success", "data": release})
	}))
	defer server.Close()

	publisher := NewGraperyWorkflowPublisher(config.WorkflowRuntimeConfig{BaseURL: server.URL, InternalAPIKey: "test-key"})
	release, err := publisher.PublishRelease(context.Background(), &domain.WorkflowRelease{ID: "wfr_1", Key: "story", Version: 1})
	if err != nil {
		t.Fatal(err)
	}
	if release.Checksum != "server-checksum" {
		t.Fatalf("checksum: %s", release.Checksum)
	}
	prompt, err := publisher.PublishPromptVersion(context.Background(), &domain.PromptTemplateVersion{ID: "ptv_1", Key: "story.system", Version: 1, Type: "chat"})
	if err != nil {
		t.Fatal(err)
	}
	if prompt.Checksum != "prompt-checksum" {
		t.Fatalf("prompt checksum: %s", prompt.Checksum)
	}
}

func TestGraperyWorkflowPublisherListsEffectiveCatalog(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet || r.URL.Path != "/api/v1/agent-policy/workflow-catalog" {
			t.Fatalf("unexpected request: %s %s", r.Method, r.URL.Path)
		}
		if r.Header.Get("X-Internal-Api-Key") != "test-key" {
			t.Fatal("missing internal api key")
		}
		if r.URL.Query().Get("surface") != "voyager.storyboard" || r.URL.Query().Get("action") != "generate" {
			t.Fatalf("catalog query was not forwarded: %s", r.URL.RawQuery)
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"code": 1, "message": "success", "data": map[string]any{"items": []any{
			map[string]any{"binding": map[string]any{"id": "wfb_1"}, "release": map[string]any{"id": "wfr_2", "key": "storyboard", "version": 2}},
		}}})
	}))
	defer server.Close()

	publisher := NewGraperyWorkflowPublisher(config.WorkflowRuntimeConfig{BaseURL: server.URL, InternalAPIKey: "test-key"})
	items, err := publisher.ListCatalog(context.Background(), "voyager.storyboard", "generate", "")
	if err != nil {
		t.Fatal(err)
	}
	if len(items) != 1 || items[0].Release.ID != "wfr_2" {
		t.Fatalf("unexpected catalog: %+v", items)
	}
}
