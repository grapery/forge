package service

import (
	"testing"

	"github.com/grapestree/fgrapery/forge/internal/domain"
)

func TestValidatePromptDraft(t *testing.T) {
	if err := validatePromptDraft("chat", "system", ""); err != nil {
		t.Fatalf("valid prompt rejected: %v", err)
	}
	if err := validatePromptDraft("unknown", "system", ""); err == nil {
		t.Fatal("expected invalid prompt type")
	}
	if err := validatePromptDraft("chat", "", ""); err == nil {
		t.Fatal("expected empty template rejection")
	}
}

func TestPromptDraftCloneRequestCopiesImmutableTemplateConfiguration(t *testing.T) {
	source := &domain.PromptTemplateDraft{
		ID: "pfd_v1", Key: "storyboard.bible", Version: 1, Revision: 4,
		Status: domain.PromptDraftStatusReleased, ReleaseID: "ptv_v1", ReleaseChecksum: "checksum",
		Type: "chat", SystemTemplate: "system {{.storyJSON}}", UserTemplate: "user",
		ModelConfig: map[string]any{"model": "gemini-2.5-flash"},
	}
	req := promptDraftCloneRequest(source)
	if req.Key != source.Key || req.Type != source.Type || req.SystemTemplate != source.SystemTemplate || req.ModelConfig["model"] != "gemini-2.5-flash" {
		t.Fatalf("clone request lost prompt configuration: %+v", req)
	}
}
