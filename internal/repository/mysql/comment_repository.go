package mysql

import (
	"fmt"
	"time"

	"github.com/grapestree/fgrapery/forge/internal/domain"
	"gorm.io/gorm"
)

func (rr *ReadRepository) ListComments(query *domain.CommentListQuery) ([]*domain.CommentItem, int64, error) {
	var total int64

	q := rr.db.Table("comments").
		Where("deleted_at IS NULL")

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
		}
	}

	return items, total, nil
}

func (rr *ReadRepository) GetCommentDetail(id string) (map[string]any, error) {
	var result map[string]any
	if err := rr.db.Table("comments").
		Where("id = ? AND deleted_at IS NULL", id).
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

	return &counts, nil
}

func (wr *WriteRepository) DeleteComment(id string) error {
	return wr.db.Table("comments").Where("id = ?", id).
		Updates(map[string]any{"deleted_at": time.Now(), "content": "[removed by admin]"}).Error
}
