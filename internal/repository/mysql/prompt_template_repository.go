package mysql

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/grapestree/fgrapery/forge/internal/domain"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func (r *Repository) NextPromptTemplateVersion(key string) (int, error) {
	var maxVersion int
	err := r.db.Model(&PromptTemplateDraft{}).Where("prompt_key = ?", strings.TrimSpace(key)).Select("COALESCE(MAX(version), 0)").Scan(&maxVersion).Error
	return maxVersion + 1, err
}

func (r *Repository) CreatePromptTemplateDraft(draft *domain.PromptTemplateDraft) error {
	row, err := promptTemplateDraftToDB(draft)
	if err != nil {
		return err
	}
	return r.db.Create(row).Error
}

func (r *Repository) GetPromptTemplateDraft(id string) (*domain.PromptTemplateDraft, error) {
	var row PromptTemplateDraft
	if err := r.db.Where("id = ?", strings.TrimSpace(id)).Take(&row).Error; err != nil {
		return nil, err
	}
	return promptTemplateDraftFromDB(&row)
}

func (r *Repository) ListPromptTemplateDrafts(status string, page, pageSize int) ([]*domain.PromptTemplateDraft, int64, error) {
	q := r.db.Model(&PromptTemplateDraft{})
	if status = strings.TrimSpace(status); status != "" {
		q = q.Where("status = ?", status)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var rows []PromptTemplateDraft
	if err := q.Order("updated_at DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&rows).Error; err != nil {
		return nil, 0, err
	}
	out := make([]*domain.PromptTemplateDraft, 0, len(rows))
	for i := range rows {
		draft, err := promptTemplateDraftFromDB(&rows[i])
		if err != nil {
			return nil, 0, err
		}
		out = append(out, draft)
	}
	return out, total, nil
}

func (r *Repository) UpdatePromptTemplateDraft(draft *domain.PromptTemplateDraft, expectedRevision int) error {
	row, err := promptTemplateDraftToDB(draft)
	if err != nil {
		return err
	}
	result := r.db.Model(&PromptTemplateDraft{}).Where("id = ? AND revision = ?", row.ID, expectedRevision).Updates(map[string]any{
		"revision": row.Revision, "type": row.Type, "system_template": row.SystemTemplate, "user_template": row.UserTemplate,
		"variables_schema_json": row.VariablesSchemaJSON, "output_schema_json": row.OutputSchemaJSON,
		"model_config_json": row.ModelConfigJSON, "status": row.Status, "updated_by": row.UpdatedBy,
	})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected != 1 {
		return errors.New("prompt draft revision conflict")
	}
	return nil
}

func (r *Repository) TransitionPromptTemplateDraft(id, from, to, actor, decision, comment string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var row PromptTemplateDraft
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", id).Take(&row).Error; err != nil {
			return err
		}
		if row.Status != from {
			return fmt.Errorf("prompt draft status is %s, expected %s", row.Status, from)
		}
		if decision != "" {
			approval := PromptTemplateApproval{ID: "pfa_" + newID(), DraftID: id, ReviewerID: actor, Decision: decision, Comment: comment}
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
		row.Status, row.UpdatedBy, row.Revision = to, actor, row.Revision+1
		return tx.Save(&row).Error
	})
}

func (r *Repository) MarkPromptTemplateDraftReleased(id, releaseID, checksum, actor string) error {
	result := r.db.Model(&PromptTemplateDraft{}).Where("id = ? AND status = ?", id, domain.PromptDraftStatusApproved).Updates(map[string]any{
		"status": domain.PromptDraftStatusReleased, "release_id": releaseID, "release_checksum": checksum,
		"updated_by": actor, "revision": gorm.Expr("revision + 1"),
	})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected != 1 {
		return errors.New("prompt draft is no longer approved")
	}
	return nil
}

func (r *Repository) ListPromptTemplateApprovals(draftID string) ([]*domain.PromptTemplateApproval, error) {
	var rows []PromptTemplateApproval
	if err := r.db.Where("draft_id = ?", draftID).Order("created_at ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*domain.PromptTemplateApproval, 0, len(rows))
	for i := range rows {
		out = append(out, &domain.PromptTemplateApproval{ID: rows[i].ID, DraftID: rows[i].DraftID, ReviewerID: rows[i].ReviewerID, Decision: rows[i].Decision, Comment: rows[i].Comment, CreatedAt: rows[i].CreatedAt})
	}
	return out, nil
}

func promptTemplateDraftToDB(draft *domain.PromptTemplateDraft) (*PromptTemplateDraft, error) {
	variables, err := json.Marshal(draft.VariablesSchema)
	if err != nil {
		return nil, err
	}
	output, err := json.Marshal(draft.OutputSchema)
	if err != nil {
		return nil, err
	}
	model, err := json.Marshal(draft.ModelConfig)
	if err != nil {
		return nil, err
	}
	approved, err := json.Marshal(draft.ApprovedBy)
	if err != nil {
		return nil, err
	}
	return &PromptTemplateDraft{
		ID: draft.ID, PromptKey: draft.Key, Version: draft.Version, Revision: draft.Revision, Type: draft.Type,
		SystemTemplate: draft.SystemTemplate, UserTemplate: draft.UserTemplate, VariablesSchemaJSON: string(variables),
		OutputSchemaJSON: string(output), ModelConfigJSON: string(model), Status: draft.Status,
		CreatedBy: draft.CreatedBy, UpdatedBy: draft.UpdatedBy, ApprovedByJSON: string(approved),
		ReleaseID: draft.ReleaseID, ReleaseChecksum: draft.ReleaseChecksum, CreatedAt: draft.CreatedAt, UpdatedAt: draft.UpdatedAt,
	}, nil
}

func promptTemplateDraftFromDB(row *PromptTemplateDraft) (*domain.PromptTemplateDraft, error) {
	out := &domain.PromptTemplateDraft{
		ID: row.ID, Key: row.PromptKey, Version: row.Version, Revision: row.Revision, Type: row.Type,
		SystemTemplate: row.SystemTemplate, UserTemplate: row.UserTemplate, Status: row.Status,
		CreatedBy: row.CreatedBy, UpdatedBy: row.UpdatedBy, ReleaseID: row.ReleaseID, ReleaseChecksum: row.ReleaseChecksum,
		CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt,
	}
	if err := json.Unmarshal([]byte(defaultForgeJSON(row.VariablesSchemaJSON, "{}")), &out.VariablesSchema); err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(defaultForgeJSON(row.OutputSchemaJSON, "{}")), &out.OutputSchema); err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(defaultForgeJSON(row.ModelConfigJSON, "{}")), &out.ModelConfig); err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(defaultForgeJSON(row.ApprovedByJSON, "[]")), &out.ApprovedBy); err != nil {
		return nil, err
	}
	return out, nil
}
