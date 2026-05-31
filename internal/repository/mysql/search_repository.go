package mysql

import (
	"fmt"

	"github.com/grapestree/fgrapery/forge/internal/domain"
)

func (rr *ReadRepository) ListSearchHistory(query *domain.SearchHistoryQuery) ([]*domain.SearchHistoryItem, int64, error) {
	var items []*domain.SearchHistoryItem
	var total int64

	q := rr.db.Table("search_histories")
	if query.Type != "" {
		q = q.Where("type = ?", query.Type)
	}
	if query.UserID != "" {
		q = q.Where("user_id = ?", query.UserID)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count search history: %w", err)
	}

	type row struct {
		ID          string `gorm:"column:id"`
		UserID      string `gorm:"column:user_id"`
		Query       string `gorm:"column:query"`
		Type        string `gorm:"column:type"`
		ResultCount int    `gorm:"column:result_count"`
		CreatedAt   int64  `gorm:"column:created_at"`
	}

	offset := (query.Page - 1) * query.PageSize
	var rows []row
	if err := q.Select("id, user_id, COALESCE(query, '') as query, COALESCE(type, '') as type, "+
		"COALESCE(result_count, 0) as result_count, created_at").
		Order("created_at DESC").Offset(offset).Limit(query.PageSize).
		Find(&rows).Error; err != nil {
		return nil, 0, fmt.Errorf("list search history: %w", err)
	}

	userIDs := make([]string, 0, len(rows))
	for _, r := range rows {
		userIDs = append(userIDs, r.UserID)
	}
	names, _ := batchUserNames(rr, userIDs)

	items = make([]*domain.SearchHistoryItem, len(rows))
	for i, r := range rows {
		items[i] = &domain.SearchHistoryItem{
			ID: r.ID, UserID: r.UserID, UserName: names[r.UserID],
			Query: r.Query, Type: r.Type, ResultCount: r.ResultCount, CreatedAt: r.CreatedAt,
		}
	}

	return items, total, nil
}

func (rr *ReadRepository) GetSearchTrends(limit int) ([]*domain.SearchTrend, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	var trends []*domain.SearchTrend
	if err := rr.db.Table("search_histories").
		Select("query, COUNT(*) as count").
		Where("query != ''").
		Group("query").
		Order("count DESC").
		Limit(limit).
		Find(&trends).Error; err != nil {
		return nil, fmt.Errorf("get search trends: %w", err)
	}
	return trends, nil
}
