package mysql

import (
	"testing"
	"time"
)

func TestNotificationItemFromRowConvertsTimestampToUnix(t *testing.T) {
	createdAt := time.Date(2026, time.June, 23, 0, 47, 51, 32_000_000, time.UTC)

	item := notificationItemFromRow(notificationListRow{
		ID: "notification-1", UserID: "user-1", Type: "system", Title: "Ready",
		Content: "Your storyboard is ready", Link: "/storyboards/1", Read: true, CreatedAt: createdAt,
	})

	if item.CreatedAt != createdAt.Unix() {
		t.Fatalf("CreatedAt = %d, want %d", item.CreatedAt, createdAt.Unix())
	}
	if item.ID != "notification-1" || item.UserID != "user-1" || !item.Read {
		t.Fatalf("notification fields not preserved: %+v", item)
	}
}
