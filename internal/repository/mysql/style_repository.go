package mysql

import (
	"fmt"

	"github.com/grapestree/fgrapery/forge/internal/domain"
)

func (rr *ReadRepository) ListStyles(query *domain.StyleListQuery) ([]*domain.StyleConfigItem, int64, error) {
	var items []*domain.StyleConfigItem
	var total int64

	q := rr.db.Table("style_configs")
	if query.Search != "" {
		q = q.Where("style LIKE ? OR description LIKE ?", "%"+query.Search+"%", "%"+query.Search+"%")
	}
	if query.UserID != "" {
		q = q.Where("user_id = ?", query.UserID)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count styles: %w", err)
	}

	type row struct {
		ID             string `gorm:"column:id"`
		Style          string `gorm:"column:style"`
		Description    string `gorm:"column:description"`
		SampleImageURL string `gorm:"column:sample_image_url"`
		UserID         string `gorm:"column:user_id"`
		CreatedAt      int64  `gorm:"column:created_at"`
		UpdatedAt      int64  `gorm:"column:updated_at"`
	}

	offset := (query.Page - 1) * query.PageSize
	var rows []row
	if err := q.Select("id, COALESCE(style, '') as style, COALESCE(description, '') as description, "+
		"COALESCE(sample_image_url, '') as sample_image_url, user_id, created_at, updated_at").
		Order("created_at DESC").Offset(offset).Limit(query.PageSize).
		Find(&rows).Error; err != nil {
		return nil, 0, fmt.Errorf("list styles: %w", err)
	}

	userIDs := make([]string, 0, len(rows))
	for _, r := range rows {
		userIDs = append(userIDs, r.UserID)
	}
	names, _ := batchUserNames(rr, userIDs)

	items = make([]*domain.StyleConfigItem, len(rows))
	for i, r := range rows {
		items[i] = &domain.StyleConfigItem{
			ID: r.ID, Style: r.Style, Description: r.Description,
			SampleImageURL: r.SampleImageURL, UserID: r.UserID,
			UserName: names[r.UserID], CreatedAt: r.CreatedAt, UpdatedAt: r.UpdatedAt,
		}
	}

	return items, total, nil
}

func (rr *ReadRepository) GetStyleDetail(id string) (map[string]any, error) {
	var result map[string]any
	if err := rr.db.Table("style_configs").Where("id = ?", id).Take(&result).Error; err != nil {
		return nil, fmt.Errorf("get style detail: %w", err)
	}
	return result, nil
}

func (wr *WriteRepository) UpdateStyle(id string, updates map[string]any) error {
	return wr.db.Table("style_configs").Where("id = ?", id).Updates(updates).Error
}

func (wr *WriteRepository) DeleteStyle(id string) error {
	return wr.db.Table("style_configs").Where("id = ?", id).Delete(nil).Error
}
