package mysql

import "gorm.io/gorm"

// ReadRepository queries grapery tables for dashboard and management.
type ReadRepository struct {
	db *gorm.DB
}

func NewReadRepository(db *gorm.DB) *ReadRepository {
	return &ReadRepository{db: db}
}

func (rr *ReadRepository) CountUsers() (int64, error) {
	var count int64
	err := rr.db.Table("users").Count(&count).Error
	return count, err
}

func (rr *ReadRepository) CountStories() (int64, error) {
	var count int64
	err := rr.db.Table("stories").Where("deleted_at IS NULL OR deleted_at = 0").Count(&count).Error
	return count, err
}

func (rr *ReadRepository) CountStoryboards() (int64, error) {
	var count int64
	err := rr.db.Table("storyboards").Where("deleted_at IS NULL OR deleted_at = 0").Count(&count).Error
	return count, err
}

func (rr *ReadRepository) CountFragments() (int64, error) {
	var count int64
	err := rr.db.Table("fragments").Where("deleted_at IS NULL").Count(&count).Error
	return count, err
}

func (rr *ReadRepository) CountCharacters() (int64, error) {
	var count int64
	err := rr.db.Table("characters").Where("deleted_at IS NULL OR deleted_at = 0").Count(&count).Error
	return count, err
}

func (rr *ReadRepository) CountAITasks() (int64, error) {
	var count int64
	err := rr.db.Table("ai_tasks").Count(&count).Error
	return count, err
}

func (rr *ReadRepository) CountMemberships() (int64, error) {
	var count int64
	err := rr.db.Table("memberships").Where("status = ?", "active").Count(&count).Error
	return count, err
}

func (rr *ReadRepository) CountOrders() (int64, error) {
	var count int64
	err := rr.db.Table("subscription_orders").Count(&count).Error
	return count, err
}

func (rr *ReadRepository) CountTokenTransactions() (int64, error) {
	var count int64
	err := rr.db.Table("token_transactions").Count(&count).Error
	return count, err
}
