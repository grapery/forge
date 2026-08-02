package mysql

import (
	"fmt"
	"time"

	"github.com/grapestree/fgrapery/forge/internal/domain"
)

func (rr *ReadRepository) GetShareOverview(days int) (*domain.ShareOverview, error) {
	if days <= 0 {
		days = 30
	}
	since := time.Now().AddDate(0, 0, -days).Unix()
	todayStart := time.Now().Truncate(24 * time.Hour).Unix()

	out := &domain.ShareOverview{}

	_ = rr.db.Table("share_events").Where("event_type = ? AND created_at >= ?", "issue", since).Count(&out.TotalIssues).Error
	_ = rr.db.Table("share_events").Where("event_type = ? AND created_at >= ?", "open", since).Count(&out.TotalOpens).Error
	_ = rr.db.Table("share_events").Where("event_type = ? AND created_at >= ?", "issue", todayStart).Count(&out.IssuesToday).Error
	_ = rr.db.Table("share_events").Where("event_type = ? AND created_at >= ?", "open", todayStart).Count(&out.OpensToday).Error

	if out.TotalIssues > 0 {
		out.OpenRate = float64(out.TotalOpens) / float64(out.TotalIssues)
	}

	type kindRow struct {
		Kind  string `gorm:"column:kind"`
		Count int64  `gorm:"column:count"`
	}
	var issueKinds []kindRow
	_ = rr.db.Table("share_events").
		Select("kind, COUNT(*) as count").
		Where("event_type = ? AND created_at >= ?", "issue", since).
		Group("kind").
		Order("count DESC").
		Find(&issueKinds).Error
	for _, r := range issueKinds {
		out.ByKindIssues = append(out.ByKindIssues, domain.ShareKindCount{Kind: r.Kind, Count: r.Count})
	}

	var openKinds []kindRow
	_ = rr.db.Table("share_events").
		Select("kind, COUNT(*) as count").
		Where("event_type = ? AND created_at >= ?", "open", since).
		Group("kind").
		Order("count DESC").
		Find(&openKinds).Error
	for _, r := range openKinds {
		out.ByKindOpens = append(out.ByKindOpens, domain.ShareKindCount{Kind: r.Kind, Count: r.Count})
	}

	type dayRow struct {
		Day    string `gorm:"column:day"`
		Issues int64  `gorm:"column:issues"`
		Opens  int64  `gorm:"column:opens"`
	}
	var daysRows []dayRow
	err := rr.db.Raw(`
		SELECT DATE(FROM_UNIXTIME(created_at)) AS day,
			SUM(CASE WHEN event_type = 'issue' THEN 1 ELSE 0 END) AS issues,
			SUM(CASE WHEN event_type = 'open' THEN 1 ELSE 0 END) AS opens
		FROM share_events
		WHERE created_at >= ?
		GROUP BY day
		ORDER BY day ASC
	`, since).Scan(&daysRows).Error
	if err != nil {
		return out, fmt.Errorf("share daily trend: %w", err)
	}
	for _, r := range daysRows {
		out.Daily = append(out.Daily, domain.ShareTrendPoint{Date: r.Day, Issues: r.Issues, Opens: r.Opens})
	}
	return out, nil
}

func (rr *ReadRepository) ListShareEvents(query *domain.ShareEventQuery) ([]*domain.ShareEventItem, int64, error) {
	var total int64
	q := rr.db.Table("share_events")
	if query.EventType != "" {
		q = q.Where("event_type = ?", query.EventType)
	}
	if query.Kind != "" {
		q = q.Where("kind = ?", query.Kind)
	}
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count share events: %w", err)
	}

	type row struct {
		ID        string `gorm:"column:id"`
		EventType string `gorm:"column:event_type"`
		Kind      string `gorm:"column:kind"`
		ContentID string `gorm:"column:content_id"`
		UserID    string `gorm:"column:user_id"`
		Platform  string `gorm:"column:platform"`
		Source    string `gorm:"column:source"`
		CreatedAt int64  `gorm:"column:created_at"`
	}

	offset := (query.Page - 1) * query.PageSize
	var rows []row
	if err := q.Select("id, event_type, kind, content_id, COALESCE(user_id,'') as user_id, COALESCE(platform,'') as platform, COALESCE(source,'') as source, created_at").
		Order("created_at DESC").Offset(offset).Limit(query.PageSize).
		Find(&rows).Error; err != nil {
		return nil, 0, fmt.Errorf("list share events: %w", err)
	}

	userIDs := make([]string, 0, len(rows))
	for _, r := range rows {
		if r.UserID != "" {
			userIDs = append(userIDs, r.UserID)
		}
	}
	names, _ := batchUserNames(rr, userIDs)

	items := make([]*domain.ShareEventItem, len(rows))
	for i, r := range rows {
		items[i] = &domain.ShareEventItem{
			ID: r.ID, EventType: r.EventType, Kind: r.Kind, ContentID: r.ContentID,
			UserID: r.UserID, UserName: names[r.UserID],
			Platform: r.Platform, Source: r.Source, CreatedAt: r.CreatedAt,
		}
	}
	return items, total, nil
}
