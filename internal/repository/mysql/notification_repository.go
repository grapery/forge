package mysql

import (
	"fmt"
	"time"

	"github.com/google/uuid"
)

// CreateSystemNotification inserts an in-app notification for a Voyager user (shared notifications table).
func (wr *WriteRepository) CreateSystemNotification(userID, typ, title, content, link string) error {
	if userID == "" {
		return nil
	}
	row := map[string]interface{}{
		"id":         uuid.New().String(),
		"user_id":    userID,
		"type":       typ,
		"title":      title,
		"content":    content,
		"link":       link,
		"read":       false,
		"created_at": time.Now(),
	}
	return wr.db.Table("notifications").Create(row).Error
}

// CreateSystemNotificationsBatch inserts many in-app notifications. Empty userIDs are skipped.
func (wr *WriteRepository) CreateSystemNotificationsBatch(userIDs []string, typ, title, content, link string) (sent int, failed int, err error) {
	if len(userIDs) == 0 {
		return 0, 0, nil
	}
	now := time.Now()
	rows := make([]map[string]interface{}, 0, len(userIDs))
	for _, userID := range userIDs {
		if userID == "" {
			continue
		}
		rows = append(rows, map[string]interface{}{
			"id":         uuid.New().String(),
			"user_id":    userID,
			"type":       typ,
			"title":      title,
			"content":    content,
			"link":       link,
			"read":       false,
			"created_at": now,
		})
	}
	if len(rows) == 0 {
		return 0, 0, nil
	}
	const chunk = 200
	for i := 0; i < len(rows); i += chunk {
		end := i + chunk
		if end > len(rows) {
			end = len(rows)
		}
		batch := rows[i:end]
		if e := wr.db.Table("notifications").Create(&batch).Error; e != nil {
			failed += len(batch)
			if err == nil {
				err = fmt.Errorf("batch insert notifications: %w", e)
			}
			continue
		}
		sent += len(batch)
	}
	return sent, failed, err
}

// ListActiveUserIDs returns active platform user IDs, optionally constrained to users with
// an active device on the given platform (ios/android). Hard-capped by limit.
func (rr *ReadRepository) ListActiveUserIDs(platform string, limit int) ([]string, error) {
	if limit <= 0 || limit > 10000 {
		limit = 5000
	}
	var ids []string
	if platform != "" {
		q := rr.db.Table("user_devices").
			Select("DISTINCT user_id").
			Where("is_active = ?", true).
			Where("platform = ?", platform).
			Limit(limit)
		if err := q.Pluck("user_id", &ids).Error; err != nil {
			return nil, fmt.Errorf("list active device user ids: %w", err)
		}
		return ids, nil
	}
	if err := rr.db.Table("users").
		Select("id").
		Where("status = ?", "active").
		Order("created_at DESC").
		Limit(limit).
		Pluck("id", &ids).Error; err != nil {
		return nil, fmt.Errorf("list active user ids: %w", err)
	}
	return ids, nil
}
