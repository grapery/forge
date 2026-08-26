package handler

import (
	"testing"

	"github.com/grapestree/fgrapery/forge/internal/auth"
	"github.com/grapestree/fgrapery/forge/internal/domain"
)

func TestRequireResolvePermissionsUsesReportedContentType(t *testing.T) {
	contentOperator := &auth.AdminContext{Role: string(domain.RoleOperator), Permissions: []string{domain.PermContentModerate}}
	if err := requireResolvePermissions(contentOperator, "story", []string{"takedown"}); err != nil {
		t.Fatalf("story takedown should allow content moderator: %v", err)
	}
	if err := requireResolvePermissions(contentOperator, "comment", []string{"takedown"}); err == nil {
		t.Fatal("comment takedown must not be granted by content moderation permission")
	}
	commentOperator := &auth.AdminContext{Role: string(domain.RoleOperator), Permissions: []string{domain.PermComments}}
	if err := requireResolvePermissions(commentOperator, "comment", []string{"takedown"}); err != nil {
		t.Fatalf("comment takedown should allow comment moderator: %v", err)
	}
	if err := requireResolvePermissions(commentOperator, "story", []string{"suspend_creator"}); err == nil {
		t.Fatal("suspending a creator must require user management permission")
	}
}
