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
	err := rr.db.Table("fragments").Where("deleted_at IS NULL OR deleted_at = 0").Count(&count).Error
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

func (rr *ReadRepository) CountNewUsers(since int64) (int64, error) {
	var count int64
	err := rr.db.Table("users").Where("created_at >= ?", since).Count(&count).Error
	return count, err
}

func (rr *ReadRepository) CountNewStories(since int64) (int64, error) {
	var count int64
	err := rr.db.Table("stories").Where("(deleted_at IS NULL OR deleted_at = 0) AND created_at >= ?", since).Count(&count).Error
	return count, err
}

func (rr *ReadRepository) CountNewCharacters(since int64) (int64, error) {
	var count int64
	err := rr.db.Table("characters").Where("(deleted_at IS NULL OR deleted_at = 0) AND created_at >= ?", since).Count(&count).Error
	return count, err
}

func (rr *ReadRepository) CountNewFragments(since int64) (int64, error) {
	var count int64
	err := rr.db.Table("fragments").Where("deleted_at IS NULL AND created_at >= ?", since).Count(&count).Error
	return count, err
}

func (rr *ReadRepository) CountNewStoryboards(since int64) (int64, error) {
	var count int64
	err := rr.db.Table("storyboards").Where("(deleted_at IS NULL OR deleted_at = 0) AND created_at >= ?", since).Count(&count).Error
	return count, err
}

func (rr *ReadRepository) CountForkEvents(since int64) (int64, error) {
	var count int64
	if !rr.db.Migrator().HasTable("story_forks") {
		return 0, nil
	}
	err := rr.db.Table("story_forks").Where("created_at >= ?", since).Count(&count).Error
	if err != nil {
		return 0, nil
	}
	return count, nil
}

func (rr *ReadRepository) SumTokenConsumed(since int64) (int64, error) {
	var total int64
	err := rr.db.Table("token_transactions").
		Select("COALESCE(SUM(ABS(amount)), 0)").
		Where("created_at >= ? AND type IN ?", since, []string{"consume", "deduct"}).
		Scan(&total).Error
	return total, err
}

func (rr *ReadRepository) CountNewOrders(since int64) (int64, error) {
	var count int64
	err := rr.db.Table("subscription_orders").Where("created_at >= ?", since).Count(&count).Error
	return count, err
}

func (rr *ReadRepository) SumRevenue(since int64) (float64, error) {
	var total float64
	err := rr.db.Table("subscription_orders").
		Where("status IN ? AND created_at >= ?", []string{"completed", "paid"}, since).
		Select("COALESCE(SUM(amount), 0)").Scan(&total).Error
	return total, err
}

func (rr *ReadRepository) CountNewAITasks(since int64) (int64, error) {
	var count int64
	err := rr.db.Table("ai_tasks").Where("created_at >= ?", since).Count(&count).Error
	return count, err
}

func (rr *ReadRepository) CountNewTokenTransactions(since int64) (int64, error) {
	var count int64
	err := rr.db.Table("token_transactions").Where("created_at >= ?", since).Count(&count).Error
	return count, err
}
