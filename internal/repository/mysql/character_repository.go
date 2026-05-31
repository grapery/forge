package mysql

import (
	"fmt"
	"time"

	"github.com/grapestree/fgrapery/forge/internal/domain"
)

func (rr *ReadRepository) ListCharacters(query *domain.CharacterListQuery) ([]*domain.CharacterItem, int64, error) {
	var items []*domain.CharacterItem
	var total int64

	q := rr.db.Table("characters").
		Where("deleted_at IS NULL OR deleted_at = 0")

	if query.Search != "" {
		search := "%" + query.Search + "%"
		q = q.Where("name LIKE ? OR description LIKE ?", search, search)
	}
	if query.IsPublic != nil {
		q = q.Where("is_public = ?", *query.IsPublic)
	}
	if query.AuthorID != "" {
		q = q.Where("author_id = ?", query.AuthorID)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count characters: %w", err)
	}

	offset := (query.Page - 1) * query.PageSize
	type row struct {
		ID                      string `gorm:"column:id"`
		Name                    string `gorm:"column:name"`
		StoryID                 string `gorm:"column:story_id"`
		UserID                  string `gorm:"column:author_id"`
		Description             string `gorm:"column:description"`
		Avatar                  string `gorm:"column:avatar"`
		Poster                  string `gorm:"column:poster"`
		Portrait                string `gorm:"column:portrait"`
		PortraitGenerationStatus string `gorm:"column:portrait_generation_status"`
		IsPublic                bool   `gorm:"column:is_public"`
		AIGenerated             bool   `gorm:"column:ai_generated"`
		SourceType              string `gorm:"column:source_type"`
		AIStyle                 string `gorm:"column:ai_style"`
		Likes                   int    `gorm:"column:likes"`
		Comments                int    `gorm:"column:comments"`
		Shares                  int    `gorm:"column:shares"`
		Followers               int    `gorm:"column:followers"`
		Stories                 int    `gorm:"column:stories"`
		CreatedAt               int64  `gorm:"column:created_at"`
		UpdatedAt               int64  `gorm:"column:updated_at"`
	}

	var rows []row
	if err := q.Select("id, name, story_id, author_id, description, avatar, poster, portrait, "+
		"portrait_generation_status, is_public, ai_generated, source_type, ai_style, "+
		"COALESCE(likes, 0) as likes, COALESCE(comments, 0) as comments, "+
		"COALESCE(shares, 0) as shares, COALESCE(followers, 0) as followers, COALESCE(stories, 0) as stories, "+
		"created_at, updated_at").
		Order("created_at DESC").Offset(offset).Limit(query.PageSize).
		Find(&rows).Error; err != nil {
		return nil, 0, fmt.Errorf("list characters: %w", err)
	}

	authorIDs := make([]string, 0, len(rows))
	for _, r := range rows {
		authorIDs = append(authorIDs, r.UserID)
	}
	names, _ := batchUserNames(rr, authorIDs)

	items = make([]*domain.CharacterItem, len(rows))
	for i, r := range rows {
		items[i] = &domain.CharacterItem{
			ID:                      r.ID,
			Name:                    r.Name,
			StoryID:                 r.StoryID,
			AuthorID:                r.UserID,
			AuthorName:              names[r.UserID],
			Description:             r.Description,
			Avatar:                  r.Avatar,
			Poster:                  r.Poster,
			Portrait:                r.Portrait,
			PortraitGenerationStatus: r.PortraitGenerationStatus,
			IsPublic:                r.IsPublic,
			AIGenerated:             r.AIGenerated,
			SourceType:              r.SourceType,
			AIStyle:                 r.AIStyle,
			Likes:                   r.Likes,
			Comments:                r.Comments,
			Shares:                  r.Shares,
			Followers:               r.Followers,
			Stories:                 r.Stories,
			CreatedAt:               r.CreatedAt,
			UpdatedAt:               r.UpdatedAt,
		}
	}

	return items, total, nil
}

func (rr *ReadRepository) GetCharacterDetail(id string) (map[string]any, error) {
	var result map[string]any
	if err := rr.db.Table("characters").
		Where("id = ? AND (deleted_at IS NULL OR deleted_at = 0)", id).
		Take(&result).Error; err != nil {
		return nil, fmt.Errorf("get character detail: %w", err)
	}
	return result, nil
}

func (rr *ReadRepository) CountCharactersByStatus() (*domain.CharacterStatusCount, error) {
	base := rr.db.Table("characters").Where("deleted_at IS NULL OR deleted_at = 0")
	var counts domain.CharacterStatusCount
	base.Count(&counts.Total)
	base.Where("is_public = ?", true).Count(&counts.Public)
	base.Where("is_public = ?", false).Count(&counts.Private)
	base.Where("ai_generated = ?", true).Count(&counts.AIGenerated)
	return &counts, nil
}

func (wr *WriteRepository) UnpublishCharacter(id string) error {
	return wr.db.Table("characters").Where("id = ?", id).
		Updates(map[string]any{"is_public": false}).Error
}

func (wr *WriteRepository) SoftDeleteCharacter(id string) error {
	return wr.db.Table("characters").Where("id = ?", id).
		Updates(map[string]any{"deleted_at": time.Now()}).Error
}
