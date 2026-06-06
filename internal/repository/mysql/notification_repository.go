package mysql

import (
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
