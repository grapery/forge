package mysql

import (
	"fmt"

	"github.com/grapestree/fgrapery/forge/internal/domain"
)

func (rr *ReadRepository) ListGenres(query *domain.GenreListQuery) ([]*domain.GenreCatalogItem, int64, error) {
	var items []*domain.GenreCatalogItem
	var total int64

	q := rr.db.Table("genre_catalog_entries")
	if query.Search != "" {
		q = q.Where("title_zh LIKE ? OR title_en LIKE ? OR title_ja LIKE ?",
			"%"+query.Search+"%", "%"+query.Search+"%", "%"+query.Search+"%")
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count genres: %w", err)
	}

	offset := (query.Page - 1) * query.PageSize
	if err := q.Select("id, COALESCE(slug, '') as slug, COALESCE(page_index, 0) as page_index, "+
		"COALESCE(sort_order, 0) as sort_order, COALESCE(title_zh, '') as title_zh, "+
		"COALESCE(title_en, '') as title_en, COALESCE(title_ja, '') as title_ja, "+
		"COALESCE(emoji, '') as emoji, COALESCE(source, '') as source, created_at").
		Order("sort_order ASC, created_at DESC").Offset(offset).Limit(query.PageSize).
		Find(&items).Error; err != nil {
		return nil, 0, fmt.Errorf("list genres: %w", err)
	}

	return items, total, nil
}

func (wr *WriteRepository) UpdateGenre(id string, updates map[string]any) error {
	return wr.db.Table("genre_catalog_entries").Where("id = ?", id).Updates(updates).Error
}
