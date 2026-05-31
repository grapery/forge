package mysql

import (
	"fmt"

	"github.com/grapestree/fgrapery/forge/internal/domain"
)

func (rr *ReadRepository) ListAccountDeletions(query *domain.AccountDeletionListQuery) ([]*domain.AccountDeletionItem, int64, error) {
	var items []*domain.AccountDeletionItem
	var total int64

	q := rr.db.Table("account_deletion_requests")

	if query.Status != "" {
		q = q.Where("status = ?", query.Status)
	}
	if query.UserID != "" {
		q = q.Where("user_id = ?", query.UserID)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count account deletions: %w", err)
	}

	offset := (query.Page - 1) * query.PageSize
	type row struct {
		ID                  string `gorm:"column:id"`
		UserID              string `gorm:"column:user_id"`
		Reason              string `gorm:"column:reason"`
		Feedback            string `gorm:"column:feedback"`
		Status              string `gorm:"column:status"`
		RequestedAt         int64  `gorm:"column:requested_at"`
		ScheduledDeletionAt int64  `gorm:"column:scheduled_deletion_at"`
		ProcessedAt         *int64 `gorm:"column:processed_at"`
		CancelledAt         *int64 `gorm:"column:cancelled_at"`
		CancelledReason     string `gorm:"column:cancelled_reason"`
		CreatedAt           int64  `gorm:"column:created_at"`
	}

	var rows []row
	if err := q.Select("id, user_id, COALESCE(reason, '') as reason, COALESCE(feedback, '') as feedback, "+
		"status, requested_at, scheduled_deletion_at, processed_at, cancelled_at, "+
		"COALESCE(cancelled_reason, '') as cancelled_reason, created_at").
		Order("created_at DESC").Offset(offset).Limit(query.PageSize).
		Find(&rows).Error; err != nil {
		return nil, 0, fmt.Errorf("list account deletions: %w", err)
	}

	userIDs := make([]string, 0, len(rows))
	for _, r := range rows {
		userIDs = append(userIDs, r.UserID)
	}
	names, _ := batchUserNames(rr, userIDs)

	items = make([]*domain.AccountDeletionItem, len(rows))
	for i, r := range rows {
		items[i] = &domain.AccountDeletionItem{
			ID:                  r.ID,
			UserID:              r.UserID,
			UserName:            names[r.UserID],
			Reason:              r.Reason,
			Feedback:            r.Feedback,
			Status:              r.Status,
			RequestedAt:         r.RequestedAt,
			ScheduledDeletionAt: r.ScheduledDeletionAt,
			ProcessedAt:         r.ProcessedAt,
			CancelledAt:         r.CancelledAt,
			CancelledReason:     r.CancelledReason,
			CreatedAt:           r.CreatedAt,
		}
	}

	return items, total, nil
}

func (rr *ReadRepository) GetAccountDeletionDetail(id string) (map[string]any, error) {
	var result map[string]any
	if err := rr.db.Table("account_deletion_requests").
		Where("id = ?", id).Take(&result).Error; err != nil {
		return nil, fmt.Errorf("get account deletion detail: %w", err)
	}
	return result, nil
}

func (rr *ReadRepository) CountAccountDeletionsByStatus() (*domain.AccountDeletionStatusCount, error) {
	var counts domain.AccountDeletionStatusCount
	rows, err := rr.db.Table("account_deletion_requests").
		Select("status, COUNT(*) as cnt").
		Group("status").Rows()
	if err != nil {
		return nil, fmt.Errorf("count account deletions by status: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var status string
		var cnt int64
		if err := rows.Scan(&status, &cnt); err != nil {
			continue
		}
		switch status {
		case "pending":
			counts.Pending = cnt
		case "processing":
			counts.Processing = cnt
		case "completed":
			counts.Completed = cnt
		case "cancelled":
			counts.Cancelled = cnt
		}
	}
	return &counts, nil
}

func (wr *WriteRepository) ProcessAccountDeletion(id string) error {
	return wr.db.Table("account_deletion_requests").Where("id = ?", id).
		Updates(map[string]any{"status": "processing", "processed_at": now()}).Error
}

func (wr *WriteRepository) CompleteAccountDeletion(id string) error {
	return wr.db.Table("account_deletion_requests").Where("id = ?", id).
		Updates(map[string]any{"status": "completed", "processed_at": now()}).Error
}

func (wr *WriteRepository) CancelAccountDeletion(id, reason string) error {
	return wr.db.Table("account_deletion_requests").Where("id = ?", id).
		Updates(map[string]any{"status": "cancelled", "cancelled_at": now(), "cancelled_reason": reason}).Error
}
