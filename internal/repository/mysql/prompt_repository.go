package mysql

import (
	"fmt"
	"time"

	"github.com/grapestree/fgrapery/forge/internal/domain"
)

func (rr *ReadRepository) ListPromptAuditRecords(query *domain.PromptAuditQuery) ([]*domain.PromptAuditRecord, int64, error) {
	var total int64

	q := rr.db.Table("ai_prompt_audit_records").
		Where("deleted_at IS NULL OR deleted_at = 0")

	if query.Provider != "" {
		q = q.Where("provider = ?", query.Provider)
	}
	if query.Model != "" {
		q = q.Where("model = ?", query.Model)
	}
	if query.PromptKind != "" {
		q = q.Where("prompt_kind = ?", query.PromptKind)
	}
	if query.RelatedEntityType != "" {
		q = q.Where("related_entity_type = ?", query.RelatedEntityType)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count prompt audit records: %w", err)
	}

	type row struct {
		ID                    string    `gorm:"column:id"`
		RunID                 string    `gorm:"column:run_id"`
		RelatedEntityType     string    `gorm:"column:related_entity_type"`
		RelatedEntityID       string    `gorm:"column:related_entity_id"`
		Step                  string    `gorm:"column:step"`
		PromptKind            string    `gorm:"column:prompt_kind"`
		PromptTemplateVersion string    `gorm:"column:prompt_template_version"`
		Provider              string    `gorm:"column:provider"`
		Model                 string    `gorm:"column:model"`
		Temperature           float64   `gorm:"column:temperature"`
		MaxTokens             int       `gorm:"column:max_tokens"`
		SystemPrompt          string    `gorm:"column:system_prompt"`
		UserPrompt            string    `gorm:"column:user_prompt"`
		FinalPrompt           string    `gorm:"column:final_prompt"`
		Output                string    `gorm:"column:output"`
		InputTokens           int       `gorm:"column:input_tokens"`
		OutputTokens          int       `gorm:"column:output_tokens"`
		AlignmentSnapshotHash string    `gorm:"column:alignment_snapshot_hash"`
		FullPromptHash        string    `gorm:"column:full_prompt_hash"`
		ReferenceImageUrls    string    `gorm:"column:reference_image_urls"`
		TokenUsageJson        string    `gorm:"column:token_usage_json"`
		MetadataJson          string    `gorm:"column:metadata_json"`
		CreatedAt             time.Time `gorm:"column:created_at"`
	}

	offset := (query.Page - 1) * query.PageSize
	var rows []row
	if err := q.Offset(offset).Limit(query.PageSize).
		Order("created_at DESC").
		Find(&rows).Error; err != nil {
		return nil, 0, fmt.Errorf("list prompt audit records: %w", err)
	}

	records := make([]*domain.PromptAuditRecord, len(rows))
	for i, r := range rows {
		records[i] = &domain.PromptAuditRecord{
			ID:                    r.ID,
			RunID:                 r.RunID,
			RelatedEntityType:     r.RelatedEntityType,
			RelatedEntityID:       r.RelatedEntityID,
			Step:                  r.Step,
			PromptKind:            r.PromptKind,
			PromptTemplateVersion: r.PromptTemplateVersion,
			Provider:              r.Provider,
			Model:                 r.Model,
			Temperature:           r.Temperature,
			MaxTokens:             r.MaxTokens,
			SystemPrompt:          r.SystemPrompt,
			UserPrompt:            r.UserPrompt,
			FinalPrompt:           r.FinalPrompt,
			Output:                r.Output,
			InputTokens:           r.InputTokens,
			OutputTokens:          r.OutputTokens,
			AlignmentSnapshotHash: r.AlignmentSnapshotHash,
			FullPromptHash:        r.FullPromptHash,
			ReferenceImageUrls:    r.ReferenceImageUrls,
			TokenUsageJson:        r.TokenUsageJson,
			MetadataJson:          r.MetadataJson,
			CreatedAt:             r.CreatedAt.Unix(),
		}
	}

	return records, total, nil
}

func (rr *ReadRepository) GetPromptAuditRecord(id string) (map[string]any, error) {
	var result map[string]any
	if err := rr.db.Table("ai_prompt_audit_records").
		Where("id = ?", id).
		Take(&result).Error; err != nil {
		return nil, fmt.Errorf("get prompt audit record: %w", err)
	}
	return result, nil
}

func (rr *ReadRepository) GetPromptAuditSummary() (*domain.PromptAuditSummary, error) {
	summary := &domain.PromptAuditSummary{}

	rr.db.Table("ai_prompt_audit_records").
		Where("deleted_at IS NULL OR deleted_at = 0").
		Count(&summary.TotalRecords)

	type tokenSum struct {
		Total int64 `gorm:"column:total"`
	}
	var ts tokenSum
	rr.db.Table("ai_prompt_audit_records").
		Where("deleted_at IS NULL OR deleted_at = 0").
		Select("COALESCE(SUM(input_tokens + output_tokens), 0) as total").
		Take(&ts)
	summary.TotalTokens = ts.Total

	var providers []domain.ProviderStat
	rr.db.Table("ai_prompt_audit_records").
		Where("deleted_at IS NULL OR deleted_at = 0").
		Select("provider, COUNT(*) as count").
		Group("provider").
		Order("count DESC").
		Limit(10).
		Find(&providers)
	summary.TopProviders = providers

	return summary, nil
}
