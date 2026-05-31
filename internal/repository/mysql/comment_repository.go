package mysql

import (
	"fmt"

	"github.com/grapestree/fgrapery/forge/internal/domain"
)

func (rr *ReadRepository) ListComments(query *domain.CommentListQuery) ([]*domain.CommentItem, int64, error) {
	var items []*domain.CommentItem
	var total int64

	q := rr.db.Table("comments").
		Where("deleted_at IS NULL OR deleted_at = 0")

	if query.TargetType != "" {
		q = q.Where("target_type = ?", query.TargetType)
	}
	if query.TargetID != "" {
		q = q.Where("target_id = ?", query.TargetID)
	}
	if query.AuthorID != "" {
		q = q.Where("author_id = ?", query.AuthorID)
	}
	if query.Search != "" {
		q = q.Where("content LIKE ?", "%"+query.Search+"%")
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count comments: %w", err)
	}

	offset := (query.Page - 1) * query.PageSize
	type row struct {
		ID         string `gorm:"column:id"`
		UserID     string `gorm:"column:author_id"`
		Content    string `gorm:"column:content"`
		TargetType string `gorm:"column:target_type"`
		TargetID   string `gorm:"column:target_id"`
		ParentID   string `gorm:"column:parent_id"`
		RootID     string `gorm:"column:root_id"`
		Likes      int    `gorm:"column:likes"`
		Dislikes   int    `gorm:"column:dislikes"`
		ReplyCount int    `gorm:"column:reply_count"`
		CreatedAt  int64  `gorm:"column:created_at"`
	}

	var rows []row
	if err := q.Select("id, author_id, content, target_type, target_id, "+
		"COALESCE(parent_id, '') as parent_id, COALESCE(root_id, '') as root_id, "+
		"COALESCE(likes, 0) as likes, COALESCE(dislikes, 0) as dislikes, "+
		"COALESCE(reply_count, 0) as reply_count, created_at").
		Order("created_at DESC").Offset(offset).Limit(query.PageSize).
		Find(&rows).Error; err != nil {
		return nil, 0, fmt.Errorf("list comments: %w", err)
	}

	authorIDs := make([]string, 0, len(rows))
	for _, r := range rows {
		authorIDs = append(authorIDs, r.UserID)
	}
	names, _ := batchUserNames(rr, authorIDs)

	items = make([]*domain.CommentItem, len(rows))
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
			CreatedAt:  r.CreatedAt,
		}
	}

	return items, total, nil
}

func (rr *ReadRepository) GetCommentDetail(id string) (map[string]any, error) {
	var result map[string]any
	if err := rr.db.Table("comments").
		Where("id = ? AND (deleted_at IS NULL OR deleted_at = 0)", id).
		Take(&result).Error; err != nil {
		return nil, fmt.Errorf("get comment detail: %w", err)
	}
	return result, nil
}

func (rr *ReadRepository) CountCommentsByTargetType() (*domain.CommentStatusCount, error) {
	var counts domain.CommentStatusCount
	base := rr.db.Table("comments").Where("deleted_at IS NULL OR deleted_at = 0")
	base.Count(&counts.Total)
	base.Where("target_type = ?", "story").Count(&counts.StoryComments)
	base.Where("target_type = ?", "fragment").Count(&counts.FragmentComments)
	base.Where("target_type = ?", "character").Count(&counts.CharacterComments)
	return &counts, nil
}

func (wr *WriteRepository) DeleteComment(id string) error {
	return wr.db.Table("comments").Where("id = ?", id).
		Updates(map[string]any{"deleted_at": now(), "content": "[removed by admin]"}).Error
}
