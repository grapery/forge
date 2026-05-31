package mysql

import (
	"fmt"

	"github.com/grapestree/fgrapery/forge/internal/domain"
)

func (rr *ReadRepository) ListTopics(query *domain.TopicListQuery) ([]*domain.TopicStats, int64, error) {
	type topicRow struct {
		Topic  string `gorm:"column:topic"`
		Cnt    int64  `gorm:"column:cnt"`
		Latest int64  `gorm:"column:latest"`
	}

	var rows []topicRow
	q := rr.db.Table("fragments").
		Select("topic, COUNT(*) as cnt, MAX(created_at) as latest").
		Where("topic IS NOT NULL AND topic != '' AND deleted_at IS NULL AND visibility = ?", "public")

	if query.Search != "" {
		q = q.Where("topic LIKE ?", "%"+query.Search+"%")
	}

	if err := q.Group("topic").Order("cnt DESC").Find(&rows).Error; err != nil {
		return nil, 0, fmt.Errorf("list topics: %w", err)
	}

	topics := make([]*domain.TopicStats, len(rows))
	for i, r := range rows {
		topics[i] = &domain.TopicStats{
			Topic:          r.Topic,
			FragmentCount:  r.Cnt,
			StoryCount:     0, // stories table has no topic field
			LatestActivity: r.Latest,
		}
	}

	total := int64(len(topics))

	start := (query.Page - 1) * query.PageSize
	if start >= int(total) {
		return []*domain.TopicStats{}, total, nil
	}
	end := start + query.PageSize
	if end > int(total) {
		end = int(total)
	}

	return topics[start:end], total, nil
}

func (rr *ReadRepository) ListFragmentsByTopic(topic string, page, pageSize int) ([]map[string]any, int64, error) {
	var total int64
	rr.db.Table("fragments").Where("topic = ? AND visibility = ? AND deleted_at IS NULL", topic, "public").Count(&total)

	var items []map[string]any
	offset := (page - 1) * pageSize
	if err := rr.db.Table("fragments").
		Where("topic = ? AND visibility = ? AND deleted_at IS NULL", topic, "public").
		Order("created_at DESC").
		Offset(offset).Limit(pageSize).
		Find(&items).Error; err != nil {
		return nil, 0, fmt.Errorf("list fragments by topic: %w", err)
	}
	return items, total, nil
}

func (rr *ReadRepository) ListStoriesByTopic(topic string, page, pageSize int) ([]map[string]any, int64, error) {
	// Stories table has no topic field; return empty result
	return []map[string]any{}, 0, nil
}
