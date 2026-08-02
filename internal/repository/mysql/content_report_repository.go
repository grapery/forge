package mysql

import (
	"fmt"
	"strings"
	"time"

	"github.com/grapestree/fgrapery/forge/internal/domain"
)

const reportSLADuration = 24 * time.Hour

func isReportOverdue(status string, createdAt time.Time) bool {
	return status == "pending" && time.Since(createdAt) > reportSLADuration
}

type ContentReportFilter struct {
	Page        int
	PageSize    int
	Status      string
	ContentType string
	Overdue     bool
	Keyword     string
	ReporterID  string
}

type contentReportRow struct {
	ID            string     `gorm:"column:id"`
	ReporterID    string     `gorm:"column:reporter_id"`
	ContentType   string     `gorm:"column:content_type"`
	ContentID     string     `gorm:"column:content_id"`
	Reason        string     `gorm:"column:reason"`
	Status        string     `gorm:"column:status"`
	ReviewRemarks string     `gorm:"column:review_remarks"`
	ReviewedBy    string     `gorm:"column:reviewed_by"`
	ReviewedAt    *time.Time `gorm:"column:reviewed_at"`
	CreatedAt     time.Time  `gorm:"column:created_at"`
	UpdatedAt     time.Time  `gorm:"column:updated_at"`
}

func (rr *ReadRepository) ListContentReports(f *ContentReportFilter) ([]*domain.ContentReport, int64, error) {
	q := rr.db.Table("content_reports").Where("deleted_at IS NULL")

	if f.Overdue {
		cutoff := time.Now().Add(-reportSLADuration)
		q = q.Where("status = ? AND created_at < ?", "pending", cutoff)
	} else if f.Status != "" {
		q = q.Where("status = ?", f.Status)
	}
	if f.ContentType != "" {
		q = q.Where("content_type = ?", f.ContentType)
	}
	if f.ReporterID != "" {
		q = q.Where("reporter_id = ?", f.ReporterID)
	}
	if kw := strings.TrimSpace(f.Keyword); kw != "" {
		like := "%" + kw + "%"
		userSub := rr.db.Table("users").Select("id").Where("username LIKE ? OR display_name LIKE ?", like, like)
		q = q.Where(
			"(reason LIKE ? OR content_id LIKE ? OR reporter_id LIKE ? OR id LIKE ? OR reporter_id IN (?))",
			like, like, like, like, userSub,
		)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var rows []contentReportRow
	offset := (f.Page - 1) * f.PageSize
	if err := q.Order("CASE WHEN status = 'pending' THEN 0 ELSE 1 END, created_at ASC").
		Offset(offset).Limit(f.PageSize).Find(&rows).Error; err != nil {
		return nil, 0, err
	}

	return rr.mapContentReportRows(rows), total, nil
}

func (rr *ReadRepository) GetContentReport(id string) (*domain.ContentReport, error) {
	var r contentReportRow
	if err := rr.db.Table("content_reports").Where("id = ? AND deleted_at IS NULL", id).Take(&r).Error; err != nil {
		return nil, err
	}
	items := rr.mapContentReportRows([]contentReportRow{r})
	if len(items) == 0 {
		return nil, fmt.Errorf("content report not found")
	}
	return items[0], nil
}

func (rr *ReadRepository) UpdateContentReportReview(id, status, remarks, reviewedBy string) error {
	now := time.Now()
	updates := map[string]any{
		"status":         status,
		"review_remarks": remarks,
		"reviewed_by":    reviewedBy,
		"reviewed_at":    now,
		"updated_at":     now,
	}
	return rr.db.Table("content_reports").Where("id = ? AND deleted_at IS NULL", id).Updates(updates).Error
}

func (rr *ReadRepository) CountContentReportsByStatus() (map[string]int64, error) {
	type row struct {
		Status string `gorm:"column:status"`
		Count  int64  `gorm:"column:cnt"`
	}
	var rows []row
	if err := rr.db.Table("content_reports").
		Select("status, count(*) as cnt").
		Where("deleted_at IS NULL").
		Group("status").
		Find(&rows).Error; err != nil {
		return nil, err
	}
	result := make(map[string]int64, len(rows))
	for _, r := range rows {
		result[r.Status] = r.Count
	}
	return result, nil
}

func (rr *ReadRepository) CountOverdueContentReports() (int64, error) {
	cutoff := time.Now().Add(-reportSLADuration)
	var count int64
	err := rr.db.Table("content_reports").
		Where("deleted_at IS NULL AND status = ? AND created_at < ?", "pending", cutoff).
		Count(&count).Error
	return count, err
}

func (rr *ReadRepository) mapContentReportRows(rows []contentReportRow) []*domain.ContentReport {
	userIDs := make(map[string]struct{})
	for _, r := range rows {
		userIDs[r.ReporterID] = struct{}{}
	}
	names := rr.batchUserNames(userIDs)

	result := make([]*domain.ContentReport, len(rows))
	for i, r := range rows {
		creatorID, title, preview, contentStatus, deleted := rr.lookupReportedContent(r.ContentType, r.ContentID)
		if creatorID != "" {
			userIDs[creatorID] = struct{}{}
		}
		creatorNames := rr.batchUserNames(map[string]struct{}{creatorID: {}})

		var reviewedAt *int64
		if r.ReviewedAt != nil {
			ts := r.ReviewedAt.Unix()
			reviewedAt = &ts
		}

		result[i] = &domain.ContentReport{
			ID:             r.ID,
			ReporterID:     r.ReporterID,
			ContentType:    r.ContentType,
			ContentID:      r.ContentID,
			Reason:         r.Reason,
			Status:         r.Status,
			IsOverdue:      isReportOverdue(r.Status, r.CreatedAt),
			ReporterName:   names[r.ReporterID],
			CreatorID:      creatorID,
			CreatorName:    creatorNames[creatorID],
			ContentTitle:   title,
			ContentPreview: preview,
			ContentStatus:  contentStatus,
			ContentDeleted: deleted,
			ReviewRemarks:  r.ReviewRemarks,
			ReviewedBy:     r.ReviewedBy,
			ReviewedAt:     reviewedAt,
			CreatedAt:      r.CreatedAt.Unix(),
			UpdatedAt:      r.UpdatedAt.Unix(),
		}
	}
	return result
}

type reportedContentInfo struct {
	CreatorID string
	Title     string
	Preview   string
	Status    string
	Deleted   bool
}

func (rr *ReadRepository) lookupReportedContent(contentType, contentID string) (creatorID, title, preview, status string, deleted bool) {
	info := rr.fetchReportedContentInfo(contentType, contentID)
	return info.CreatorID, info.Title, info.Preview, info.Status, info.Deleted
}

func (rr *ReadRepository) fetchReportedContentInfo(contentType, contentID string) reportedContentInfo {
	var info reportedContentInfo
	if contentID == "" {
		return info
	}

	switch strings.ToLower(contentType) {
	case "storyboard":
		type row struct {
			CreatorID       string `gorm:"column:creator_id"`
			Title           string `gorm:"column:title"`
			WorkflowStatus  string `gorm:"column:workflow_status"`
			DeletedAt       any    `gorm:"column:deleted_at"`
		}
		var r row
		if err := rr.db.Table("storyboards").Select("creator_id, title, workflow_status, deleted_at").
			Where("id = ?", contentID).Take(&r).Error; err != nil {
			info.Deleted = true
			return info
		}
		info.CreatorID = r.CreatorID
		info.Title = r.Title
		info.Preview = truncatePreview(r.Title, 120)
		info.Status = r.WorkflowStatus
		info.Deleted = r.DeletedAt != nil

	case "fragment":
		type row struct {
			CreatorID  string `gorm:"column:creator_id"`
			Caption    string `gorm:"column:caption"`
			Visibility string `gorm:"column:visibility"`
			DeletedAt  any    `gorm:"column:deleted_at"`
		}
		var r row
		if err := rr.db.Table("fragments").Select("creator_id, caption, visibility, deleted_at").
			Where("id = ?", contentID).Take(&r).Error; err != nil {
			info.Deleted = true
			return info
		}
		info.CreatorID = r.CreatorID
		info.Title = r.Caption
		info.Preview = truncatePreview(r.Caption, 120)
		info.Status = r.Visibility
		info.Deleted = r.DeletedAt != nil

	case "comment":
		type row struct {
			AuthorID  string `gorm:"column:author_id"`
			Content   string `gorm:"column:content"`
			DeletedAt any    `gorm:"column:deleted_at"`
		}
		var r row
		if err := rr.db.Table("comments").Select("author_id, content, deleted_at").
			Where("id = ?", contentID).Take(&r).Error; err != nil {
			info.Deleted = true
			return info
		}
		info.CreatorID = r.AuthorID
		info.Preview = truncatePreview(r.Content, 120)
		info.Status = "active"
		info.Deleted = r.DeletedAt != nil

	case "story":
		type row struct {
			AuthorID  string `gorm:"column:author_id"`
			Title     string `gorm:"column:title"`
			Status    string `gorm:"column:status"`
			DeletedAt any    `gorm:"column:deleted_at"`
		}
		var r row
		if err := rr.db.Table("stories").Select("author_id, title, status, deleted_at").
			Where("id = ?", contentID).Take(&r).Error; err != nil {
			info.Deleted = true
			return info
		}
		info.CreatorID = r.AuthorID
		info.Title = r.Title
		info.Preview = truncatePreview(r.Title, 120)
		info.Status = r.Status
		info.Deleted = r.DeletedAt != nil

	case "character":
		type row struct {
			AuthorID  string `gorm:"column:author_id"`
			Name      string `gorm:"column:name"`
			DeletedAt any    `gorm:"column:deleted_at"`
		}
		var r row
		if err := rr.db.Table("characters").Select("author_id, name, deleted_at").
			Where("id = ?", contentID).Take(&r).Error; err != nil {
			info.Deleted = true
			return info
		}
		info.CreatorID = r.AuthorID
		info.Title = r.Name
		info.Preview = truncatePreview(r.Name, 120)
		info.Status = "active"
		info.Deleted = r.DeletedAt != nil
	}
	return info
}

func truncatePreview(s string, max int) string {
	s = strings.TrimSpace(s)
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}
