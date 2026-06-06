package mysql

import (
	"fmt"
	"time"

	"github.com/grapestree/fgrapery/forge/internal/domain"
)

type BlockFilter struct {
	Page      int
	PageSize  int
	BlockerID string
	BlockedID string
	Search    string
}

func (rr *ReadRepository) ListUserBlocks(f *BlockFilter) ([]*domain.UserBlock, int64, error) {
	q := rr.db.Table("user_blocks").Where("deleted_at IS NULL")

	if f.BlockerID != "" {
		q = q.Where("blocker_id = ?", f.BlockerID)
	}
	if f.BlockedID != "" {
		q = q.Where("blocked_id = ?", f.BlockedID)
	}
	if f.Search != "" {
		like := "%" + f.Search + "%"
		sub := rr.db.Table("users").Select("id").Where("username LIKE ? OR display_name LIKE ?", like, like)
		q = q.Where("blocker_id IN (?) OR blocked_id IN (?)", sub, sub)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	type row struct {
		ID        string    `gorm:"column:id"`
		BlockerID string    `gorm:"column:blocker_id"`
		BlockedID string    `gorm:"column:blocked_id"`
		CreatedAt time.Time `gorm:"column:created_at"`
	}
	var rows []row
	offset := (f.Page - 1) * f.PageSize
	if err := q.Order("created_at DESC").Offset(offset).Limit(f.PageSize).Find(&rows).Error; err != nil {
		return nil, 0, err
	}

	userIDs := make(map[string]struct{})
	for _, r := range rows {
		userIDs[r.BlockerID] = struct{}{}
		userIDs[r.BlockedID] = struct{}{}
	}
	names := rr.batchUserNames(userIDs)

	result := make([]*domain.UserBlock, len(rows))
	for i, r := range rows {
		result[i] = &domain.UserBlock{
			ID:          r.ID,
			BlockerID:   r.BlockerID,
			BlockedID:   r.BlockedID,
			BlockerName: names[r.BlockerID],
			BlockedName: names[r.BlockedID],
			CreatedAt:   r.CreatedAt.Unix(),
		}
	}
	return result, total, nil
}

func (rr *ReadRepository) GetUserBlock(id string) (*domain.UserBlock, error) {
	type row struct {
		ID        string    `gorm:"column:id"`
		BlockerID string    `gorm:"column:blocker_id"`
		BlockedID string    `gorm:"column:blocked_id"`
		CreatedAt time.Time `gorm:"column:created_at"`
	}
	var r row
	if err := rr.db.Table("user_blocks").Where("id = ? AND deleted_at IS NULL", id).Take(&r).Error; err != nil {
		return nil, err
	}
	names := rr.batchUserNames(map[string]struct{}{r.BlockerID: {}, r.BlockedID: {}})
	return &domain.UserBlock{
		ID:          r.ID,
		BlockerID:   r.BlockerID,
		BlockedID:   r.BlockedID,
		BlockerName: names[r.BlockerID],
		BlockedName: names[r.BlockedID],
		CreatedAt:   r.CreatedAt.Unix(),
	}, nil
}

func (rr *ReadRepository) CountUserBlocks() (*domain.BlockCounts, error) {
	var total int64
	if err := rr.db.Table("user_blocks").Where("deleted_at IS NULL").Count(&total).Error; err != nil {
		return nil, err
	}
	cutoff := time.Now().Add(-7 * 24 * time.Hour)
	var last7 int64
	if err := rr.db.Table("user_blocks").Where("deleted_at IS NULL AND created_at >= ?", cutoff).Count(&last7).Error; err != nil {
		return nil, err
	}
	return &domain.BlockCounts{Total: total, Last7Days: last7}, nil
}

func (rr *ReadRepository) CountPendingUserReports() (int64, error) {
	var count int64
	err := rr.db.Table("user_reports").Where("deleted_at IS NULL AND status = ?", "pending").Count(&count).Error
	return count, err
}

func (rr *ReadRepository) CountPendingContentReports() (int64, error) {
	var count int64
	err := rr.db.Table("content_reports").Where("deleted_at IS NULL AND status = ?", "pending").Count(&count).Error
	return count, err
}

func (rr *ReadRepository) CountOverdueUserReports() (int64, error) {
	cutoff := time.Now().Add(-reportSLADuration)
	var count int64
	err := rr.db.Table("user_reports").
		Where("deleted_at IS NULL AND status = ? AND created_at < ?", "pending", cutoff).
		Count(&count).Error
	return count, err
}

func (rr *ReadRepository) CountOverdueReportsTotal() (int64, error) {
	userOverdue, err := rr.CountOverdueUserReports()
	if err != nil {
		return 0, fmt.Errorf("count overdue user reports: %w", err)
	}
	contentOverdue, err := rr.CountOverdueContentReports()
	if err != nil {
		return 0, fmt.Errorf("count overdue content reports: %w", err)
	}
	return userOverdue + contentOverdue, nil
}
