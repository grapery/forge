package mysql

import (
	"fmt"

	"github.com/grapestree/fgrapery/forge/internal/domain"
)

func (rr *ReadRepository) ListAITasks(query *domain.AITaskListQuery) ([]*domain.AITaskItem, int64, error) {
	var total int64

	q := rr.db.Table("ai_tasks")
	if query.Type != "" {
		q = q.Where("type = ?", query.Type)
	}
	if query.Status != "" {
		q = q.Where("status = ?", query.Status)
	}
	if query.Provider != "" {
		q = q.Where("provider = ?", query.Provider)
	}
	if query.Model != "" {
		q = q.Where("model = ?", query.Model)
	}
	if query.UserID != "" {
		q = q.Where("user_id = ?", query.UserID)
	}
	if query.DateFrom != "" {
		q = q.Where("created_at >= ?", query.DateFrom)
	}
	if query.DateTo != "" {
		q = q.Where("created_at <= ?", query.DateTo)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count ai tasks: %w", err)
	}

	type row struct {
		ID                string `gorm:"column:id"`
		Type              string `gorm:"column:type"`
		Status            string `gorm:"column:status"`
		Provider          string `gorm:"column:provider"`
		Model             string `gorm:"column:model"`
		UserID            string `gorm:"column:user_id"`
		TokensUsed        int64  `gorm:"column:tokens_used"`
		Progress          int    `gorm:"column:progress"`
		RelatedEntityID   string `gorm:"column:related_entity_id"`
		RelatedEntityType string `gorm:"column:related_entity_type"`
		Error             string `gorm:"column:error_message"`
		CreatedAt         int64  `gorm:"column:created_at"`
		StartedAt         *int64 `gorm:"column:started_at"`
		CompletedAt       *int64 `gorm:"column:completed_at"`
	}

	offset := (query.Page - 1) * query.PageSize
	var rows []row
	if err := q.Select("id, type, status, provider, model, user_id, "+
		"COALESCE(tokens_used, 0) as tokens_used, "+
		"COALESCE(progress, 0) as progress, "+
		"COALESCE(related_entity_id, '') as related_entity_id, "+
		"COALESCE(related_entity_type, '') as related_entity_type, "+
		"COALESCE(error_message, '') as error_message, "+
		"created_at, UNIX_TIMESTAMP(started_at) as started_at, UNIX_TIMESTAMP(completed_at) as completed_at").
		Order("created_at DESC").Offset(offset).Limit(query.PageSize).
		Find(&rows).Error; err != nil {
		return nil, 0, fmt.Errorf("list ai tasks: %w", err)
	}

	userIDs := make([]string, 0, len(rows))
	for _, r := range rows {
		userIDs = append(userIDs, r.UserID)
	}
	names, _ := batchUserNames(rr, userIDs)

	items := make([]*domain.AITaskItem, len(rows))
	for i, r := range rows {
		items[i] = &domain.AITaskItem{
			ID:                r.ID,
			Type:              r.Type,
			Status:            r.Status,
			Provider:          r.Provider,
			Model:             r.Model,
			UserID:            r.UserID,
			UserName:          names[r.UserID],
			TokensUsed:        r.TokensUsed,
			Progress:          r.Progress,
			RelatedEntityID:   r.RelatedEntityID,
			RelatedEntityType: r.RelatedEntityType,
			Error:             r.Error,
			CreatedAt:         r.CreatedAt,
			StartedAt:         r.StartedAt,
			CompletedAt:       r.CompletedAt,
		}
	}

	return items, total, nil
}

func (rr *ReadRepository) GetAITaskDetail(id string) (map[string]any, error) {
	var result map[string]any
	if err := rr.db.Table("ai_tasks").Where("id = ?", id).Take(&result).Error; err != nil {
		return nil, fmt.Errorf("get ai task detail: %w", err)
	}
	return result, nil
}

func (rr *ReadRepository) GetAITaskSummary() (*domain.AITaskSummary, error) {
	summary := &domain.AITaskSummary{}

	rr.db.Table("ai_tasks").Count(&summary.TotalTasks)
	rr.db.Table("ai_tasks").Where("status = ?", "pending").Count(&summary.PendingTasks)
	rr.db.Table("ai_tasks").Where("status = ?", "completed").Count(&summary.CompletedTasks)
	rr.db.Table("ai_tasks").Where("status = ?", "failed").Count(&summary.FailedTasks)

	type tokenSum struct {
		Total int64 `gorm:"column:total"`
	}
	var ts tokenSum
	rr.db.Table("ai_tasks").
		Select("COALESCE(SUM(tokens_used), 0) as total").
		Take(&ts)
	summary.TotalTokens = ts.Total

	var providers []domain.ProviderStat
	rr.db.Table("ai_tasks").
		Select("provider, COUNT(*) as count").
		Group("provider").
		Order("count DESC").
		Limit(10).
		Find(&providers)
	summary.TopProviders = providers

	return summary, nil
}

func (rr *ReadRepository) ListAIGenerationRecords(query *domain.AIGenerationListQuery) ([]*domain.AIGenerationRecordItem, int64, error) {
	var total int64

	q := rr.db.Table("ai_generation_records")
	if query.Type != "" {
		q = q.Where("type = ?", query.Type)
	}
	if query.Status != "" {
		q = q.Where("status = ?", query.Status)
	}
	if query.Provider != "" {
		q = q.Where("provider = ?", query.Provider)
	}
	if query.Model != "" {
		q = q.Where("model = ?", query.Model)
	}
	if query.UserID != "" {
		q = q.Where("user_id = ?", query.UserID)
	}
	if query.DateFrom != "" {
		q = q.Where("created_at >= ?", query.DateFrom)
	}
	if query.DateTo != "" {
		q = q.Where("created_at <= ?", query.DateTo)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count ai generation records: %w", err)
	}

	type row struct {
		ID           string `gorm:"column:id"`
		Type         string `gorm:"column:type"`
		Status       string `gorm:"column:status"`
		Provider     string `gorm:"column:provider"`
		Model        string `gorm:"column:model"`
		UserID       string `gorm:"column:user_id"`
		InputTokens  int    `gorm:"column:input_tokens"`
		OutputTokens int    `gorm:"column:output_tokens"`
		TotalTokens  int    `gorm:"column:total_tokens"`
		CreatedAt    int64  `gorm:"column:created_at"`
	}

	offset := (query.Page - 1) * query.PageSize
	var rows []row
	if err := q.Select("id, type, status, provider, model, user_id, "+
		"COALESCE(input_tokens, 0) as input_tokens, COALESCE(output_tokens, 0) as output_tokens, "+
		"COALESCE(total_tokens, 0) as total_tokens, "+
		"created_at").
		Order("created_at DESC").Offset(offset).Limit(query.PageSize).
		Find(&rows).Error; err != nil {
		return nil, 0, fmt.Errorf("list ai generation records: %w", err)
	}

	userIDs := make([]string, 0, len(rows))
	for _, r := range rows {
		userIDs = append(userIDs, r.UserID)
	}
	names, _ := batchUserNames(rr, userIDs)

	items := make([]*domain.AIGenerationRecordItem, len(rows))
	for i, r := range rows {
		items[i] = &domain.AIGenerationRecordItem{
			ID:           r.ID,
			Type:         r.Type,
			Status:       r.Status,
			Provider:     r.Provider,
			Model:        r.Model,
			UserID:       r.UserID,
			UserName:     names[r.UserID],
			InputTokens:  r.InputTokens,
			OutputTokens: r.OutputTokens,
			TotalTokens:  r.TotalTokens,
			CreatedAt:    r.CreatedAt,
		}
	}

	return items, total, nil
}

func (rr *ReadRepository) GetAIGenerationDetail(id string) (map[string]any, error) {
	var result map[string]any
	if err := rr.db.Table("ai_generation_records").Where("id = ?", id).Take(&result).Error; err != nil {
		return nil, fmt.Errorf("get ai generation detail: %w", err)
	}
	return result, nil
}

func (rr *ReadRepository) GetAIGenerationSummary() (*domain.AIGenerationSummary, error) {
	summary := &domain.AIGenerationSummary{}

	rr.db.Table("ai_generation_records").Count(&summary.TotalRecords)

	type tokenSum struct {
		Total int64 `gorm:"column:total"`
	}
	var ts tokenSum
	rr.db.Table("ai_generation_records").
		Select("COALESCE(SUM(total_tokens), 0) as total").
		Take(&ts)
	summary.TotalTokens = ts.Total

	var providers []domain.ProviderStat
	rr.db.Table("ai_generation_records").
		Select("provider, COUNT(*) as count").
		Group("provider").
		Order("count DESC").
		Limit(10).
		Find(&providers)
	summary.TopProviders = providers

	return summary, nil
}

func (wr *WriteRepository) CancelAITask(id string) error {
	return wr.db.Table("ai_tasks").Where("id = ?", id).
		Updates(map[string]any{"status": "cancelled", "updated_at": now()}).Error
}
