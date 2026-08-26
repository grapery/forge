package mysql

import (
	"fmt"
	"strings"
	"time"

	"github.com/grapestree/fgrapery/forge/internal/domain"
	"gorm.io/gorm"
)

func (rr *ReadRepository) ListComments(query *domain.CommentListQuery) ([]*domain.CommentItem, int64, error) {
	applyFilters := func(db *gorm.DB) *gorm.DB {
		switch query.Lifecycle {
		case "removed":
			db = db.Where("deleted_at IS NOT NULL")
		case "all":
		default:
			db = db.Where("deleted_at IS NULL")
		}
		if query.TargetType != "" {
			db = db.Where("target_type = ?", query.TargetType)
		}
		if query.TargetID != "" {
			db = db.Where("target_id = ?", query.TargetID)
		}
		if query.AuthorID != "" {
			db = db.Where("author_id = ?", query.AuthorID)
		}
		if kw := strings.TrimSpace(query.Search); kw != "" {
			like := "%" + kw + "%"
			userSub := rr.db.Table("users").Select("id").Where("username LIKE ? OR display_name LIKE ?", like, like)
			db = db.Where("content LIKE ? OR author_id LIKE ? OR author_id IN (?)", like, like, userSub)
		}
		return db
	}

	var total int64
	if err := applyFilters(rr.db.Table("comments")).Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count comments: %w", err)
	}

	type row struct {
		ID         string    `gorm:"column:id"`
		UserID     string    `gorm:"column:author_id"`
		Content    string    `gorm:"column:content"`
		TargetType string    `gorm:"column:target_type"`
		TargetID   string    `gorm:"column:target_id"`
		ParentID   string    `gorm:"column:parent_id"`
		RootID     string    `gorm:"column:root_id"`
		Likes      int       `gorm:"column:likes"`
		Dislikes   int       `gorm:"column:dislikes"`
		ReplyCount int       `gorm:"column:reply_count"`
		CreatedAt  time.Time `gorm:"column:created_at"`
		IsRemoved  bool      `gorm:"column:is_removed"`
	}

	offset := (query.Page - 1) * query.PageSize
	var rows []row
	if err := applyFilters(rr.db.Table("comments")).Select("id, author_id, content, target_type, target_id, " +
		"COALESCE(parent_id, '') as parent_id, COALESCE(root_id, '') as root_id, " +
		"COALESCE(likes, 0) as likes, COALESCE(dislikes, 0) as dislikes, " +
		"COALESCE(reply_count, 0) as reply_count, CASE WHEN deleted_at IS NULL THEN 0 ELSE 1 END as is_removed, created_at").
		Order("created_at DESC").Offset(offset).Limit(query.PageSize).
		Find(&rows).Error; err != nil {
		return nil, 0, fmt.Errorf("list comments: %w", err)
	}

	authorIDs := make([]string, 0, len(rows))
	for _, r := range rows {
		authorIDs = append(authorIDs, r.UserID)
	}
	names, _ := batchUserNames(rr, authorIDs)

	items := make([]*domain.CommentItem, len(rows))
	for i, r := range rows {
		items[i] = &domain.CommentItem{
			ID:         r.ID,
			AuthorID:   r.UserID,
			AuthorName: names[r.UserID],
			Content:    r.Content,
			TargetType: r.TargetType,
			TargetID:   r.TargetID,
			ParentID:   r.ParentID,
			RootID:     r.RootID,
			Likes:      r.Likes,
			Dislikes:   r.Dislikes,
			ReplyCount: r.ReplyCount,
			CreatedAt:  r.CreatedAt.Unix(),
			IsRemoved:  r.IsRemoved,
		}
	}

	return items, total, nil
}

func (rr *ReadRepository) GetCommentDetail(id string) (map[string]any, error) {
	var result map[string]any
	if err := rr.db.Table("comments").
		Where("id = ?", id).
		Take(&result).Error; err != nil {
		return nil, fmt.Errorf("get comment detail: %w", err)
	}
	return result, nil
}

func (rr *ReadRepository) CountCommentsByTargetType() (*domain.CommentStatusCount, error) {
	newSession := func() *gorm.DB {
		return rr.db.Table("comments").Where("deleted_at IS NULL")
	}

	var counts domain.CommentStatusCount
	newSession().Count(&counts.Total)
	newSession().Where("target_type = ?", "story").Count(&counts.StoryComments)
	newSession().Where("target_type = ?", "fragment").Count(&counts.FragmentComments)
	newSession().Where("target_type = ?", "character").Count(&counts.CharacterComments)
	rr.db.Table("comments").Where("deleted_at IS NOT NULL").Count(&counts.Removed)

	return &counts, nil
}

func (wr *WriteRepository) DeleteComment(id string) error {
	return wr.db.Table("comments").Where("id = ?", id).
		Update("deleted_at", time.Now()).Error
}

func (wr *WriteRepository) RestoreComment(id string) error {
	return wr.db.Table("comments").Where("id = ?", id).Update("deleted_at", nil).Error
}
