package mysql

import (
	"strings"
	"time"

	"github.com/grapestree/fgrapery/forge/internal/domain"
)

// Feedback support-desk SLA targets (mirrors forge/web lib/feedback-sla.ts).
const (
	FeedbackSLAWarnSeconds     int64 = 24 * 60 * 60
	FeedbackSLACriticalSeconds int64 = 72 * 60 * 60
)

// feedbackOpenStatuses are the statuses still awaiting support action.
var feedbackOpenStatuses = []string{"received", "processing"}

// FeedbackFilter holds query parameters for listing feedback.
type FeedbackFilter struct {
	Page     int
	PageSize int
	Status   string
	Category string
	UserID   string
	Keyword  string
	// Overdue restricts results to open feedback older than the 24h first-touch target.
	Overdue bool
}

// ListFeedback returns paginated user_feedback entries with optional filters.
func (rr *ReadRepository) ListFeedback(f *FeedbackFilter) ([]*domain.Feedback, int64, error) {
	q := rr.db.Table("user_feedback")

	if f.Status != "" {
		q = q.Where("status = ?", f.Status)
	}
	if f.Category != "" {
		q = q.Where("category = ?", f.Category)
	}
	if f.UserID != "" {
		q = q.Where("user_id = ?", f.UserID)
	}
	if f.Overdue {
		cutoff := time.Now().Unix() - FeedbackSLAWarnSeconds
		q = q.Where("status IN ?", feedbackOpenStatuses).Where("created_at < ?", cutoff)
	}
	if kw := strings.TrimSpace(f.Keyword); kw != "" {
		like := "%" + kw + "%"
		userSub := rr.db.Table("users").Select("id").Where("username LIKE ? OR display_name LIKE ?", like, like)
		q = q.Where(
			"(content LIKE ? OR contact_info LIKE ? OR user_id LIKE ? OR id LIKE ? OR user_id IN (?))",
			like, like, like, like, userSub,
		)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	type row struct {
		ID          string `gorm:"column:id"`
		UserID      string `gorm:"column:user_id"`
		Category    string `gorm:"column:category"`
		Content     string `gorm:"column:content"`
		ContactInfo string `gorm:"column:contact_info"`
		Status      string `gorm:"column:status"`
		Response    string `gorm:"column:response"`
		CreatedAt   int64  `gorm:"column:created_at"`
		UpdatedAt   int64  `gorm:"column:updated_at"`
	}

	var rows []row
	offset := (f.Page - 1) * f.PageSize
	if err := q.Order("created_at DESC").Offset(offset).Limit(f.PageSize).Find(&rows).Error; err != nil {
		return nil, 0, err
	}

	userIDs := make([]string, 0, len(rows))
	for _, r := range rows {
		if r.UserID != "" {
			userIDs = append(userIDs, r.UserID)
		}
	}
	names, _ := batchUserNames(rr, userIDs)

	result := make([]*domain.Feedback, len(rows))
	for i, r := range rows {
		result[i] = &domain.Feedback{
			ID:          r.ID,
			UserID:      r.UserID,
			UserName:    names[r.UserID],
			Category:    r.Category,
			Content:     r.Content,
			ContactInfo: r.ContactInfo,
			Status:      r.Status,
			Response:    r.Response,
			CreatedAt:   r.CreatedAt,
			UpdatedAt:   r.UpdatedAt,
		}
	}
	return result, total, nil
}

// GetFeedback returns a single feedback by ID.
func (rr *ReadRepository) GetFeedback(id string) (*domain.Feedback, error) {
	type row struct {
		ID          string `gorm:"column:id"`
		UserID      string `gorm:"column:user_id"`
		Category    string `gorm:"column:category"`
		Content     string `gorm:"column:content"`
		ContactInfo string `gorm:"column:contact_info"`
		Status      string `gorm:"column:status"`
		Response    string `gorm:"column:response"`
		CreatedAt   int64  `gorm:"column:created_at"`
		UpdatedAt   int64  `gorm:"column:updated_at"`
	}

	var r row
	if err := rr.db.Table("user_feedback").Where("id = ?", id).Take(&r).Error; err != nil {
		return nil, err
	}

	fb := &domain.Feedback{
		ID:          r.ID,
		UserID:      r.UserID,
		Category:    r.Category,
		Content:     r.Content,
		ContactInfo: r.ContactInfo,
		Status:      r.Status,
		Response:    r.Response,
		CreatedAt:   r.CreatedAt,
		UpdatedAt:   r.UpdatedAt,
	}
	if r.UserID != "" {
		names, _ := batchUserNames(rr, []string{r.UserID})
		fb.UserName = names[r.UserID]
	}
	return fb, nil
}

// UpdateFeedback updates status and/or response for a feedback entry.
func (rr *ReadRepository) UpdateFeedback(id, status, response string, hasStatus, hasResponse bool) error {
	updates := map[string]interface{}{
		"updated_at": time.Now().Unix(),
	}
	if hasStatus {
		updates["status"] = status
	}
	if hasResponse {
		updates["response"] = response
	}
	return rr.db.Table("user_feedback").Where("id = ?", id).Updates(updates).Error
}

// CountFeedbackByStatus returns counts grouped by status.
func (rr *ReadRepository) CountFeedbackByStatus() (map[string]int64, error) {
	type row struct {
		Status string `gorm:"column:status"`
		Count  int64  `gorm:"column:cnt"`
	}

	var rows []row
	if err := rr.db.Table("user_feedback").
		Select("status, count(*) as cnt").
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

// CountFeedbackOverdue returns exact counts of open feedback past the 24h and 72h SLA targets.
func (rr *ReadRepository) CountFeedbackOverdue() (overdue int64, critical int64, err error) {
	now := time.Now().Unix()

	if err = rr.db.Table("user_feedback").
		Where("status IN ?", feedbackOpenStatuses).
		Where("created_at < ?", now-FeedbackSLAWarnSeconds).
		Count(&overdue).Error; err != nil {
		return 0, 0, err
	}

	if err = rr.db.Table("user_feedback").
		Where("status IN ?", feedbackOpenStatuses).
		Where("created_at < ?", now-FeedbackSLACriticalSeconds).
		Count(&critical).Error; err != nil {
		return 0, 0, err
	}
	return overdue, critical, nil
}
