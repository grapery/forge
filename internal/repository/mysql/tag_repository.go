package mysql

import (
	"fmt"
	"time"

	"github.com/grapestree/fgrapery/forge/internal/domain"
)

func (rr *ReadRepository) ListTags(query *domain.TagListQuery) ([]*domain.TagItem, int64, error) {
	var items []*domain.TagItem
	var total int64

	q := rr.db.Table("tags")
	if query.Category != "" {
		q = q.Where("category = ?", query.Category)
	}
	if query.Search != "" {
		q = q.Where("name LIKE ?", "%"+query.Search+"%")
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count tags: %w", err)
	}

	offset := (query.Page - 1) * query.PageSize
	if err := q.Select("id, name, COALESCE(category, '') as category, COALESCE(usage_count, 0) as usage_count, created_at").
		Order("usage_count DESC, created_at DESC").Offset(offset).Limit(query.PageSize).
		Find(&items).Error; err != nil {
		return nil, 0, fmt.Errorf("list tags: %w", err)
	}

	return items, total, nil
}

func (rr *ReadRepository) GetTagDetail(id string) (map[string]any, error) {
	var result map[string]any
	if err := rr.db.Table("tags").Where("id = ?", id).Take(&result).Error; err != nil {
		return nil, fmt.Errorf("get tag detail: %w", err)
	}
	return result, nil
}

func (wr *WriteRepository) CreateTag(name, category string) error {
	return wr.db.Table("tags").Create(map[string]any{
		"name": name, "category": category, "usage_count": 0, "created_at": time.Now(), "updated_at": time.Now(),
	}).Error
}

func (wr *WriteRepository) UpdateTag(id string, name, category string) error {
	updates := map[string]any{"updated_at": time.Now()}
	if name != "" {
		updates["name"] = name
	}
	if category != "" {
		updates["category"] = category
	}
	return wr.db.Table("tags").Where("id = ?", id).Updates(updates).Error
}

func (wr *WriteRepository) DeleteTag(id string) error {
	return wr.db.Table("tags").Where("id = ?", id).Delete(nil).Error
}
