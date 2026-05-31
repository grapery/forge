package mysql

import (
	"fmt"
	"time"

	"github.com/grapestree/fgrapery/forge/internal/domain"
)

func (rr *ReadRepository) ListContent(query *domain.ContentListQuery) ([]*domain.ContentItem, int64, error) {
	tableName := contentTableName(query.ContentType)
	if tableName == "" {
		return nil, 0, fmt.Errorf("invalid content type: %s", query.ContentType)
	}

	// Column mapping per content type
	var userCol, statusCol, titleCol string
	switch query.ContentType {
	case "story":
		userCol = "author_id"
		statusCol = "status"
		titleCol = "title"
	case "storyboard":
		userCol = "creator_id"
		statusCol = "workflow_status"
		titleCol = "title"
	case "fragment":
		userCol = "creator_id"
		statusCol = "visibility"
		titleCol = "caption"
	}

	base := rr.db.Table(tableName).Where("deleted_at IS NULL")

	if query.Search != "" {
		base = base.Where(fmt.Sprintf("%s LIKE ?", titleCol), "%"+query.Search+"%")
	}
	if query.Status != "" {
		base = base.Where(fmt.Sprintf("%s = ?", statusCol), query.Status)
	}
	if query.AuthorID != "" {
		base = base.Where(fmt.Sprintf("%s = ?", userCol), query.AuthorID)
	}

	var total int64
	if err := base.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count content: %w", err)
	}

	// Use raw scan struct to handle differing column names
	type row struct {
		ID        string    `gorm:"column:id"`
		UserID    string    `gorm:"column:user_id"`
		Title     string    `gorm:"column:title"`
		Status    string    `gorm:"column:status"`
		Visibility string   `gorm:"column:visibility"`
		Likes     int       `gorm:"column:likes"`
		Comments  int       `gorm:"column:comments"`
		CreatedAt time.Time `gorm:"column:created_at"`
		UpdatedAt time.Time `gorm:"column:updated_at"`
	}

	selectCols := fmt.Sprintf("id, %s as user_id, %s as title, %s as status, "+
		"COALESCE(visibility, '') as visibility, "+
		"COALESCE(likes, 0) as likes, COALESCE(comments, 0) as comments, "+
		"created_at, updated_at", userCol, titleCol, statusCol)

	offset := (query.Page - 1) * query.PageSize
	var rows []row
	if err := base.Select(selectCols).
		Order("created_at DESC").Offset(offset).Limit(query.PageSize).
		Find(&rows).Error; err != nil {
		return nil, 0, fmt.Errorf("list content: %w", err)
	}

	authorIDs := make([]string, 0, len(rows))
	for _, r := range rows {
		authorIDs = append(authorIDs, r.UserID)
	}
	names, _ := batchUserNames(rr, authorIDs)

	items := make([]*domain.ContentItem, len(rows))
	for i, r := range rows {
		status := r.Status
		visibility := r.Visibility
		title := r.Title
		if title == "" {
			title = "Untitled"
		}

		// Normalize status display: for fragments, the "status" column is visibility
		displayStatus := status
		if query.ContentType == "fragment" {
			displayStatus = status // public/followers_only/private
		}

		items[i] = &domain.ContentItem{
			ID:          r.ID,
			Title:       title,
			ContentType: query.ContentType,
			AuthorID:    r.UserID,
			AuthorName:  names[r.UserID],
			Status:      displayStatus,
			Visibility:  visibility,
			Likes:       r.Likes,
			Comments:    r.Comments,
			CreatedAt:   r.CreatedAt.Unix(),
			UpdatedAt:   r.UpdatedAt.Unix(),
		}
	}

	return items, total, nil
}

func (rr *ReadRepository) GetContentDetail(contentType, id string) (map[string]any, error) {
	tableName := contentTableName(contentType)
	if tableName == "" {
		return nil, fmt.Errorf("invalid content type: %s", contentType)
	}

	var result map[string]any
	if err := rr.db.Table(tableName).
		Where("id = ? AND deleted_at IS NULL", id).
		Take(&result).Error; err != nil {
		return nil, fmt.Errorf("get content detail: %w", err)
	}
	return result, nil
}

func (rr *ReadRepository) CountContentByStatus(contentType string) (*domain.ContentStatusCount, error) {
	tableName := contentTableName(contentType)
	if tableName == "" {
		return nil, fmt.Errorf("invalid content type: %s", contentType)
	}

	base := rr.db.Table(tableName).Where("deleted_at IS NULL")
	var counts domain.ContentStatusCount
	base.Count(&counts.Total)

	switch contentType {
	case "story":
		base.Where("status = ?", "published").Count(&counts.Published)
		base.Where("status = ?", "draft").Count(&counts.Draft)
		base.Where("status NOT IN ?", []string{"published", "draft"}).Count(&counts.Other)
	case "storyboard":
		base.Where("workflow_status = ?", "published").Count(&counts.Published)
		base.Where("workflow_status = ?", "draft").Count(&counts.Draft)
		base.Where("workflow_status NOT IN ?", []string{"published", "draft"}).Count(&counts.Other)
	case "fragment":
		base.Where("visibility = ?", "public").Count(&counts.Published)
		base.Where("visibility IN ?", []string{"private", "followers_only"}).Count(&counts.Draft)
	}

	return &counts, nil
}

func contentTableName(contentType string) string {
	switch contentType {
	case "story":
		return "stories"
	case "storyboard":
		return "storyboards"
	case "fragment":
		return "fragments"
	default:
		return ""
	}
}

func batchUserNames(rr *ReadRepository, ids []string) (map[string]string, error) {
	names := make(map[string]string)
	type nameRow struct {
		ID          string `gorm:"column:id"`
		DisplayName string `gorm:"column:display_name"`
		Username    string `gorm:"column:username"`
	}
	var rows []nameRow
	if err := rr.db.Table("users").Select("id, display_name, username").Where("id IN ?", ids).Find(&rows).Error; err != nil {
		return names, err
	}
	for _, r := range rows {
		names[r.ID] = r.DisplayName
		if names[r.ID] == "" {
			names[r.ID] = r.Username
		}
	}
	return names, nil
}
