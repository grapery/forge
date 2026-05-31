package mysql

import (
	"fmt"

	"github.com/grapestree/fgrapery/forge/internal/domain"
)

func (rr *ReadRepository) ListPromptAuditRecords(query *domain.PromptAuditQuery) ([]*domain.PromptAuditRecord, int64, error) {
	var records []*domain.PromptAuditRecord
	var total int64

	q := rr.db.Table("ai_prompt_audit_records")
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

	offset := (query.Page - 1) * query.PageSize
	if err := q.Order("created_at DESC").Offset(offset).Limit(query.PageSize).Find(&records).Error; err != nil {
		return nil, 0, fmt.Errorf("list prompt audit records: %w", err)
	}

	return records, total, nil
}

func (rr *ReadRepository) GetPromptAuditRecord(id string) (*domain.PromptAuditRecord, error) {
	var record domain.PromptAuditRecord
	if err := rr.db.Table("ai_prompt_audit_records").Where("id = ?", id).First(&record).Error; err != nil {
		return nil, fmt.Errorf("get prompt audit record: %w", err)
	}
	return &record, nil
}

func (rr *ReadRepository) GetPromptAuditSummary() (*domain.PromptAuditSummary, error) {
	summary := &domain.PromptAuditSummary{}

	rr.db.Table("ai_prompt_audit_records").Count(&summary.TotalRecords)

	type tokenSum struct {
		Total int64 `gorm:"column:total"`
	}
	var ts tokenSum
	rr.db.Table("ai_prompt_audit_records").
		Select("COALESCE(SUM(input_tokens + output_tokens), 0) as total").
		Take(&ts)
	summary.TotalTokens = ts.Total

	var providers []domain.ProviderStat
	rr.db.Table("ai_prompt_audit_records").
		Select("provider, COUNT(*) as count").
		Group("provider").
		Order("count DESC").
		Limit(10).
		Find(&providers)
	summary.TopProviders = providers

	return summary, nil
}
