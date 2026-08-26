package mysql

import (
	"fmt"

	"github.com/grapestree/fgrapery/forge/internal/domain"
	"gorm.io/gorm"
)

type contentRow struct {
	ID         string `gorm:"column:id"`
	UserID     string `gorm:"column:user_id"`
	Title      string `gorm:"column:title"`
	Status     string `gorm:"column:status"`
	Visibility string `gorm:"column:visibility"`
	Likes      int    `gorm:"column:likes"`
	Comments   int    `gorm:"column:comments"`
	CreatedAt  int64  `gorm:"column:created_at"`
	UpdatedAt  int64  `gorm:"column:updated_at"`
	StoryID    string `gorm:"column:story_id"`
	ParentID   string `gorm:"column:parent_id"`
	IsRemoved  bool   `gorm:"column:is_removed"`
}

func (rr *ReadRepository) ListContent(query *domain.ContentListQuery) ([]*domain.ContentItem, int64, error) {
	tableName := contentTableName(query.ContentType)
	if tableName == "" {
		return nil, 0, fmt.Errorf("invalid content type: %s", query.ContentType)
	}

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

	// Apply filters to a fresh query builder each time to avoid GORM state corruption
	applyFilters := func(db *gorm.DB) *gorm.DB {
		switch query.Lifecycle {
		case "removed":
			db = db.Where("deleted_at IS NOT NULL AND deleted_at <> 0")
		case "all":
			// Operators can review both active and removed content.
		default:
			db = db.Where("deleted_at IS NULL OR deleted_at = 0")
		}
		if query.Search != "" {
			db = db.Where(fmt.Sprintf("%s LIKE ?", titleCol), "%"+query.Search+"%")
		}
		if query.Status != "" {
			db = db.Where(fmt.Sprintf("%s = ?", statusCol), query.Status)
		}
		if query.AuthorID != "" {
			db = db.Where(fmt.Sprintf("%s = ?", userCol), query.AuthorID)
		}
		if query.ContentType == "storyboard" {
			switch query.Lineage {
			case "root":
				db = db.Where("(parent_id IS NULL OR parent_id = '' OR parent_id = ?)", "__root__")
			case "continuation":
				db = db.Where("parent_id IS NOT NULL AND parent_id <> '' AND parent_id <> ?", "__root__")
			}
		}
		if query.ReportState != "" && query.ReportState != "all" {
			reportQuery := rr.db.Table("content_reports cr").
				Select("1").
				Where("cr.deleted_at IS NULL AND cr.content_type = ? AND cr.content_id = "+tableName+".id", query.ContentType)
			switch query.ReportState {
			case "pending_reports":
				reportQuery = reportQuery.Where("cr.status = ?", "pending")
			case "unreported":
				db = db.Where("NOT EXISTS (?)", reportQuery)
				return db
			case "reported":
				// Any report status qualifies.
			default:
				return db
			}
			db = db.Where("EXISTS (?)", reportQuery)
		}
		return db
	}

	// Count query — independent builder
	var total int64
	if err := applyFilters(rr.db.Table(tableName)).Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count content: %w", err)
	}

	// Build SELECT columns based on actual table schema:
	// stories: has visibility+likes, NO comments column. created_at is datetime.
	// storyboards: has likes+comments, NO visibility column. created_at is datetime.
	// fragments: has visibility+likes+comments. created_at is bigint (unix timestamp).
	var selectCols string
	switch query.ContentType {
	case "story":
		selectCols = fmt.Sprintf(
			"id, %s as user_id, %s as title, %s as status, "+
				"COALESCE(visibility, '') as visibility, "+
				"COALESCE(likes, 0) as likes, "+
				"0 as comments, "+
				"CASE WHEN deleted_at IS NULL OR deleted_at = 0 THEN 0 ELSE 1 END as is_removed, "+
				"UNIX_TIMESTAMP(created_at) as created_at, UNIX_TIMESTAMP(updated_at) as updated_at",
			userCol, titleCol, statusCol)
	case "storyboard":
		selectCols = fmt.Sprintf(
			"id, %s as user_id, %s as title, %s as status, "+
				"'' as visibility, "+
				"COALESCE(likes, 0) as likes, COALESCE(comments, 0) as comments, "+
				"COALESCE(story_id, '') as story_id, COALESCE(parent_id, '') as parent_id, "+
				"CASE WHEN deleted_at IS NULL OR deleted_at = 0 THEN 0 ELSE 1 END as is_removed, "+
				"UNIX_TIMESTAMP(created_at) as created_at, UNIX_TIMESTAMP(updated_at) as updated_at",
			userCol, titleCol, statusCol)
	case "fragment":
		selectCols = fmt.Sprintf(
			"id, %s as user_id, %s as title, %s as status, "+
				"COALESCE(visibility, '') as visibility, "+
				"COALESCE(likes, 0) as likes, COALESCE(comments, 0) as comments, "+
				"CASE WHEN deleted_at IS NULL OR deleted_at = 0 THEN 0 ELSE 1 END as is_removed, created_at, updated_at",
			userCol, titleCol, statusCol)
	}

	// List query — fresh builder, independent from count
	offset := (query.Page - 1) * query.PageSize
	var rows []contentRow
	if err := applyFilters(rr.db.Table(tableName)).
		Select(selectCols).
		Order("created_at DESC").Offset(offset).Limit(query.PageSize).
		Find(&rows).Error; err != nil {
		return nil, 0, fmt.Errorf("list content: %w", err)
	}

	authorIDs := make([]string, 0, len(rows))
	for _, r := range rows {
		authorIDs = append(authorIDs, r.UserID)
	}
	names, _ := batchUserNames(rr, authorIDs)
	parentIDs := make([]string, 0, len(rows))
	for _, r := range rows {
		if r.ParentID != "" && r.ParentID != "__root__" {
			parentIDs = append(parentIDs, r.ParentID)
		}
	}
	parentTitles, _ := batchStoryboardTitles(rr, parentIDs)
	reportCounts, _ := batchContentReportCounts(rr, query.ContentType, contentRowIDs(rows))

	items := make([]*domain.ContentItem, len(rows))
	for i, r := range rows {
		title := r.Title
		if title == "" {
			title = "Untitled"
		}

		items[i] = &domain.ContentItem{
			ID:                 r.ID,
			Title:              title,
			ContentType:        query.ContentType,
			AuthorID:           r.UserID,
			AuthorName:         names[r.UserID],
			Status:             r.Status,
			Visibility:         r.Visibility,
			Likes:              r.Likes,
			Comments:           r.Comments,
			CreatedAt:          r.CreatedAt,
			UpdatedAt:          r.UpdatedAt,
			StoryID:            r.StoryID,
			ParentID:           r.ParentID,
			ParentTitle:        parentTitles[r.ParentID],
			IsContinuation:     query.ContentType == "storyboard" && r.ParentID != "" && r.ParentID != "__root__",
			IsRemoved:          r.IsRemoved,
			ReportCount:        reportCounts[r.ID].Total,
			PendingReportCount: reportCounts[r.ID].Pending,
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
		Where("id = ?", id).
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

	newSession := func() *gorm.DB {
		return rr.db.Table(tableName).Where("deleted_at IS NULL OR deleted_at = 0")
	}

	var counts domain.ContentStatusCount
	newSession().Count(&counts.Total)

	switch contentType {
	case "story":
		newSession().Where("status = ?", "published").Count(&counts.Published)
		newSession().Where("status = ?", "draft").Count(&counts.Draft)
		newSession().Where("status NOT IN ?", []string{"published", "draft"}).Count(&counts.Other)
	case "storyboard":
		newSession().Where("workflow_status = ?", "published").Count(&counts.Published)
		newSession().Where("workflow_status = ?", "draft").Count(&counts.Draft)
		newSession().Where("workflow_status NOT IN ?", []string{"published", "draft"}).Count(&counts.Other)
		newSession().Where("parent_id IS NULL OR parent_id = '' OR parent_id = ?", "__root__").Count(&counts.Root)
		newSession().Where("parent_id IS NOT NULL AND parent_id <> '' AND parent_id <> ?", "__root__").Count(&counts.Continuation)
	case "fragment":
		newSession().Where("visibility = ?", "public").Count(&counts.Published)
		newSession().Where("visibility IN ?", []string{"private", "followers_only"}).Count(&counts.Draft)
	}
	if err := rr.db.Table(tableName).Where("deleted_at IS NOT NULL AND deleted_at <> 0").Count(&counts.Removed).Error; err != nil {
		return nil, err
	}
	if err := rr.db.Table("content_reports").Where("deleted_at IS NULL AND content_type = ?", contentType).
		Distinct("content_id").Count(&counts.Reported).Error; err != nil {
		return nil, err
	}
	if err := rr.db.Table("content_reports").Where("deleted_at IS NULL AND content_type = ? AND status = ?", contentType, "pending").
		Distinct("content_id").Count(&counts.PendingReports).Error; err != nil {
		return nil, err
	}

	return &counts, nil
}

func batchStoryboardTitles(rr *ReadRepository, ids []string) (map[string]string, error) {
	titles := make(map[string]string)
	if len(ids) == 0 {
		return titles, nil
	}
	type titleRow struct {
		ID    string `gorm:"column:id"`
		Title string `gorm:"column:title"`
	}
	var rows []titleRow
	if err := rr.db.Table("storyboards").Select("id, title").Where("id IN ?", ids).Find(&rows).Error; err != nil {
		return titles, err
	}
	for _, r := range rows {
		titles[r.ID] = r.Title
	}
	return titles, nil
}

type contentReportCount struct {
	Total   int64
	Pending int64
}

func contentRowIDs(rows []contentRow) []string {
	ids := make([]string, 0, len(rows))
	for _, r := range rows {
		ids = append(ids, r.ID)
	}
	return ids
}

func batchContentReportCounts(rr *ReadRepository, contentType string, ids []string) (map[string]contentReportCount, error) {
	counts := make(map[string]contentReportCount)
	if len(ids) == 0 {
		return counts, nil
	}
	type row struct {
		ContentID string `gorm:"column:content_id"`
		Total     int64  `gorm:"column:total"`
		Pending   int64  `gorm:"column:pending"`
	}
	var rows []row
	if err := rr.db.Table("content_reports").
		Select("content_id, COUNT(*) AS total, SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending").
		Where("deleted_at IS NULL AND content_type = ? AND content_id IN ?", contentType, ids).
		Group("content_id").Find(&rows).Error; err != nil {
		return counts, err
	}
	for _, r := range rows {
		counts[r.ContentID] = contentReportCount{Total: r.Total, Pending: r.Pending}
	}
	return counts, nil
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
	if len(ids) == 0 {
		return names, nil
	}
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
