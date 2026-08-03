package mysql

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func (r *Repository) NextWorkflowVersion(key string) (int, error) {
	var maxVersion int
	if err := r.db.Model(&WorkflowDraft{}).Where("workflow_key = ?", strings.TrimSpace(key)).Select("COALESCE(MAX(version), 0)").Scan(&maxVersion).Error; err != nil {
		return 0, err
	}
	return maxVersion + 1, nil
}

func (r *Repository) CreateWorkflowDraft(draft *domain.WorkflowDraft) error {
	row, err := workflowDraftToDB(draft)
	if err != nil {
		return err
	}
	return r.db.Create(row).Error
}

func (r *Repository) GetWorkflowDraft(id string) (*domain.WorkflowDraft, error) {
	var row WorkflowDraft
	if err := r.db.Where("id = ?", strings.TrimSpace(id)).Take(&row).Error; err != nil {
		return nil, err
	}
	return workflowDraftFromDB(&row)
}

func (r *Repository) ListWorkflowDrafts(status string, page, pageSize int) ([]*domain.WorkflowDraft, int64, error) {
	q := r.db.Model(&WorkflowDraft{})
	if status = strings.TrimSpace(status); status != "" {
		q = q.Where("status = ?", status)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var rows []WorkflowDraft
	if err := q.Order("updated_at DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&rows).Error; err != nil {
		return nil, 0, err
	}
	out := make([]*domain.WorkflowDraft, 0, len(rows))
	for i := range rows {
		draft, err := workflowDraftFromDB(&rows[i])
		if err != nil {
			return nil, 0, err
		}
		out = append(out, draft)
	}
	return out, total, nil
}

func (r *Repository) UpdateWorkflowDraft(draft *domain.WorkflowDraft, expectedRevision int) error {
	row, err := workflowDraftToDB(draft)
	if err != nil {
		return err
	}
	updates := map[string]any{
		"revision": row.Revision, "name": row.Name, "description": row.Description,
		"manifest_json": row.ManifestJSON, "definition_json": row.DefinitionJSON,
		"prompt_bundle_json": row.PromptBundleJSON, "policies_json": row.PoliciesJSON,
		"status": row.Status, "updated_by": row.UpdatedBy,
	}
	result := r.db.Model(&WorkflowDraft{}).Where("id = ? AND revision = ?", row.ID, expectedRevision).Updates(updates)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected != 1 {
		return errors.New("workflow draft revision conflict")
	}
	return nil
}

func (r *Repository) TransitionWorkflowDraft(id, from, to, actor, decision, comment string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var row WorkflowDraft
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", id).Take(&row).Error; err != nil {
			return err
		}
		if row.Status != from {
			return fmt.Errorf("workflow draft status is %s, expected %s", row.Status, from)
		}
		if decision != "" {
			approval := WorkflowApproval{
				ID: "wfa_" + newID(), DraftID: id, ReviewerID: actor, Decision: decision, Comment: comment,
			}
			if err := tx.Create(&approval).Error; err != nil {
				return err
			}
			var approved []string
			_ = json.Unmarshal([]byte(defaultForgeJSON(row.ApprovedByJSON, "[]")), &approved)
			if decision == "approved" && !containsString(approved, actor) {
				approved = append(approved, actor)
				b, _ := json.Marshal(approved)
				row.ApprovedByJSON = string(b)
			}
		}
		row.Status = to
		row.UpdatedBy = actor
		row.Revision++
		return tx.Save(&row).Error
	})
}

func (r *Repository) MarkWorkflowDraftReleased(id, releaseID, checksum, actor string) error {
	result := r.db.Model(&WorkflowDraft{}).Where("id = ? AND status = ?", id, domain.WorkflowDraftStatusApproved).Updates(map[string]any{
		"status": domain.WorkflowDraftStatusReleased, "release_id": releaseID,
		"release_checksum": checksum, "updated_by": actor, "revision": gorm.Expr("revision + 1"),
	})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected != 1 {
		return errors.New("workflow draft is no longer approved")
	}
	return nil
}

func (r *Repository) ListWorkflowApprovals(draftID string) ([]*domain.WorkflowApproval, error) {
	var rows []WorkflowApproval
	if err := r.db.Where("draft_id = ?", draftID).Order("created_at ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*domain.WorkflowApproval, 0, len(rows))
	for i := range rows {
		out = append(out, &domain.WorkflowApproval{ID: rows[i].ID, DraftID: rows[i].DraftID, ReviewerID: rows[i].ReviewerID, Decision: rows[i].Decision, Comment: rows[i].Comment, CreatedAt: rows[i].CreatedAt})
	}
	return out, nil
}

func workflowDraftToDB(draft *domain.WorkflowDraft) (*WorkflowDraft, error) {
	manifest, err := json.Marshal(draft.Manifest)
	if err != nil {
		return nil, err
	}
	definition, err := json.Marshal(draft.Definition)
	if err != nil {
		return nil, err
	}
	bundle, err := json.Marshal(draft.PromptBundle)
	if err != nil {
		return nil, err
	}
	policies, err := json.Marshal(draft.Policies)
	if err != nil {
		return nil, err
	}
	approved, err := json.Marshal(draft.ApprovedBy)
	if err != nil {
		return nil, err
	}
	return &WorkflowDraft{
		ID: draft.ID, WorkflowKey: draft.Key, Version: draft.Version, Revision: draft.Revision,
		Name: draft.Name, Description: draft.Description, Status: draft.Status,
		ManifestJSON: string(manifest), DefinitionJSON: string(definition), PromptBundleJSON: string(bundle),
		PoliciesJSON: string(policies), CreatedBy: draft.CreatedBy, UpdatedBy: draft.UpdatedBy,
		ApprovedByJSON: string(approved), ReleaseID: draft.ReleaseID, ReleaseChecksum: draft.ReleaseChecksum,
		CreatedAt: draft.CreatedAt, UpdatedAt: draft.UpdatedAt,
	}, nil
}

func workflowDraftFromDB(row *WorkflowDraft) (*domain.WorkflowDraft, error) {
	out := &domain.WorkflowDraft{
		ID: row.ID, Key: row.WorkflowKey, Version: row.Version, Revision: row.Revision,
		Name: row.Name, Description: row.Description, Status: row.Status, CreatedBy: row.CreatedBy,
		UpdatedBy: row.UpdatedBy, ReleaseID: row.ReleaseID, ReleaseChecksum: row.ReleaseChecksum,
		CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt,
	}
	if err := json.Unmarshal([]byte(defaultForgeJSON(row.ManifestJSON, "{}")), &out.Manifest); err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(row.DefinitionJSON), &out.Definition); err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(defaultForgeJSON(row.PromptBundleJSON, "{}")), &out.PromptBundle); err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(defaultForgeJSON(row.PoliciesJSON, "{}")), &out.Policies); err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(defaultForgeJSON(row.ApprovedByJSON, "[]")), &out.ApprovedBy); err != nil {
		return nil, err
	}
	return out, nil
}

func defaultForgeJSON(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func containsString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func newID() string {
	return uuid.NewString()
}
