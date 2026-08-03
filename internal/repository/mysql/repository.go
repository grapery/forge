package mysql

import (
	"go.uber.org/zap"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Repository struct {
	db     *gorm.DB
	logger *zap.Logger
}

func NewRepository(db *gorm.DB, logger *zap.Logger) *Repository {
	return &Repository{db: db, logger: logger}
}

func (r *Repository) DB() *gorm.DB { return r.db }

func (r *Repository) AutoMigrate() error {
	return r.db.AutoMigrate(
		&AdminUser{},
		&AdminOperationLog{},
		&DailyStat{},
		&OpsAssistantSession{},
		&OpsAssistantMessage{},
		&OpsAssistantToolCall{},
		&WorkflowDraft{},
		&WorkflowApproval{},
		&PromptTemplateDraft{},
		&PromptTemplateApproval{},
	)
}

func (r *Repository) UpsertDailyStat(stat *DailyStat) error {
	return r.db.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "date"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"total_users", "new_users", "total_stories", "new_stories",
			"total_characters", "new_characters", "total_fragments", "new_fragments",
			"total_storyboards", "new_storyboards",
			"active_memberships", "total_orders", "new_orders",
			"total_revenue", "new_revenue", "total_ai_tasks", "new_ai_tasks",
			"total_token_tx", "new_token_tx", "token_consumed", "fork_events",
		}),
	}).Create(stat).Error
}

func (r *Repository) GetLatestStats(days int) ([]DailyStat, error) {
	var stats []DailyStat
	err := r.db.Order("date DESC").Limit(days).Find(&stats).Error
	return stats, err
}

func (r *Repository) GetDailyStat(date string) (*DailyStat, error) {
	var stat DailyStat
	err := r.db.Where("date = ?", date).Take(&stat).Error
	if err != nil {
		return nil, err
	}
	return &stat, nil
}
