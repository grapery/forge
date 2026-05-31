package mysql

import (
	"fmt"

	"github.com/grapestree/fgrapery/forge/internal/domain"
)

func (rr *ReadRepository) ListDevices(query *domain.DeviceListQuery) ([]*domain.UserDeviceItem, int64, error) {
	var items []*domain.UserDeviceItem
	var total int64

	q := rr.db.Table("user_devices")
	if query.UserID != "" {
		q = q.Where("user_id = ?", query.UserID)
	}
	if query.Platform != "" {
		q = q.Where("platform = ?", query.Platform)
	}
	if query.IsActive != nil {
		q = q.Where("is_active = ?", *query.IsActive)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count devices: %w", err)
	}

	type row struct {
		ID           string `gorm:"column:id"`
		UserID       string `gorm:"column:user_id"`
		DeviceToken  string `gorm:"column:device_token"`
		Platform     string `gorm:"column:platform"`
		PushProvider string `gorm:"column:push_provider"`
		DeviceModel  string `gorm:"column:device_model"`
		OSVersion    string `gorm:"column:os_version"`
		AppVersion   string `gorm:"column:app_version"`
		IsActive     bool   `gorm:"column:is_active"`
		LastActiveAt int64  `gorm:"column:last_active_at"`
		CreatedAt    int64  `gorm:"column:created_at"`
	}

	offset := (query.Page - 1) * query.PageSize
	var rows []row
	if err := q.Select("id, user_id, COALESCE(device_token, '') as device_token, "+
		"COALESCE(platform, '') as platform, COALESCE(push_provider, '') as push_provider, "+
		"COALESCE(device_model, '') as device_model, COALESCE(os_version, '') as os_version, "+
		"COALESCE(app_version, '') as app_version, is_active, COALESCE(last_active_at, 0) as last_active_at, created_at").
		Order("created_at DESC").Offset(offset).Limit(query.PageSize).
		Find(&rows).Error; err != nil {
		return nil, 0, fmt.Errorf("list devices: %w", err)
	}

	userIDs := make([]string, 0, len(rows))
	for _, r := range rows {
		userIDs = append(userIDs, r.UserID)
	}
	names, _ := batchUserNames(rr, userIDs)

	items = make([]*domain.UserDeviceItem, len(rows))
	for i, r := range rows {
		items[i] = &domain.UserDeviceItem{
			ID: r.ID, UserID: r.UserID, UserName: names[r.UserID],
			DeviceToken: r.DeviceToken, Platform: r.Platform, PushProvider: r.PushProvider,
			DeviceModel: r.DeviceModel, OSVersion: r.OSVersion, AppVersion: r.AppVersion,
			IsActive: r.IsActive, LastActiveAt: r.LastActiveAt, CreatedAt: r.CreatedAt,
		}
	}

	return items, total, nil
}

func (rr *ReadRepository) CountDevicesByPlatform() (*domain.DevicePlatformCount, error) {
	var counts domain.DevicePlatformCount
	rows, err := rr.db.Table("user_devices").
		Select("platform, COUNT(*) as cnt").
		Where("is_active = ?", true).
		Group("platform").Rows()
	if err != nil {
		return nil, fmt.Errorf("count devices by platform: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var platform string
		var cnt int64
		if err := rows.Scan(&platform, &cnt); err != nil {
			continue
		}
		switch platform {
		case "ios":
			counts.IOS = cnt
		case "android":
			counts.Android = cnt
		default:
			counts.Other += cnt
		}
	}
	return &counts, nil
}

func (rr *ReadRepository) ListNotifications(query *domain.NotificationListQuery) ([]*domain.NotificationItem, int64, error) {
	var items []*domain.NotificationItem
	var total int64

	q := rr.db.Table("notifications")
	if query.UserID != "" {
		q = q.Where("user_id = ?", query.UserID)
	}
	if query.Type != "" {
		q = q.Where("type = ?", query.Type)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count notifications: %w", err)
	}

	offset := (query.Page - 1) * query.PageSize
	if err := q.Select("id, user_id, COALESCE(type, '') as type, COALESCE(title, '') as title, "+
		"COALESCE(content, '') as content, COALESCE(read, false) as read, created_at").
		Order("created_at DESC").Offset(offset).Limit(query.PageSize).
		Find(&items).Error; err != nil {
		return nil, 0, fmt.Errorf("list notifications: %w", err)
	}

	return items, total, nil
}
