package mysql

import (
	"fmt"
	"strings"
	"time"

	"github.com/grapestree/fgrapery/forge/internal/domain"
)

type ReportFilter struct {
	Page       int
	PageSize   int
	Status     string
	Overdue    bool
	Keyword    string
	ReporterID string
	ReportedID string
}

func (rr *ReadRepository) ListReports(f *ReportFilter) ([]*domain.Report, int64, error) {
	q := rr.db.Table("user_reports").Where("deleted_at IS NULL")

	if f.Overdue {
		cutoff := time.Now().Add(-reportSLADuration)
		q = q.Where("status = ? AND created_at < ?", "pending", cutoff)
	} else if f.Status != "" {
		q = q.Where("status = ?", f.Status)
	}
	if f.ReporterID != "" {
		q = q.Where("reporter_id = ?", f.ReporterID)
	}
	if f.ReportedID != "" {
		q = q.Where("reported_id = ?", f.ReportedID)
	}
	if kw := strings.TrimSpace(f.Keyword); kw != "" {
		like := "%" + kw + "%"
		userSub := rr.db.Table("users").Select("id").Where("username LIKE ? OR display_name LIKE ?", like, like)
		q = q.Where(
			"(reason LIKE ? OR reporter_id LIKE ? OR reported_id LIKE ? OR id LIKE ? OR reporter_id IN (?) OR reported_id IN (?))",
			like, like, like, like, userSub, userSub,
		)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	type row struct {
		ID            string     `gorm:"column:id"`
		ReporterID    string     `gorm:"column:reporter_id"`
		ReportedID    string     `gorm:"column:reported_id"`
		Reason        string     `gorm:"column:reason"`
		Status        string     `gorm:"column:status"`
		ReviewRemarks string     `gorm:"column:review_remarks"`
		ReviewedBy    string     `gorm:"column:reviewed_by"`
		ReviewedAt    *time.Time `gorm:"column:reviewed_at"`
		CreatedAt     time.Time  `gorm:"column:created_at"`
		UpdatedAt     time.Time  `gorm:"column:updated_at"`
	}

	var rows []row
	offset := (f.Page - 1) * f.PageSize
	if err := q.Order("CASE WHEN status = 'pending' THEN 0 ELSE 1 END, created_at ASC").
		Offset(offset).Limit(f.PageSize).Find(&rows).Error; err != nil {
		return nil, 0, err
	}

	userIDSet := make(map[string]struct{})
	for _, r := range rows {
		userIDSet[r.ReporterID] = struct{}{}
		userIDSet[r.ReportedID] = struct{}{}
	}
	userNames := rr.batchUserNames(userIDSet)

	result := make([]*domain.Report, len(rows))
	for i, r := range rows {
		var reviewedAt *int64
		if r.ReviewedAt != nil {
			ts := r.ReviewedAt.Unix()
			reviewedAt = &ts
		}
		result[i] = &domain.Report{
			ID:            r.ID,
			ReporterID:    r.ReporterID,
			ReportedID:    r.ReportedID,
			Reason:        r.Reason,
			Status:        r.Status,
			IsOverdue:     isReportOverdue(r.Status, r.CreatedAt),
			ReporterName:  userNames[r.ReporterID],
			ReportedName:  userNames[r.ReportedID],
			ReviewRemarks: r.ReviewRemarks,
			ReviewedBy:    r.ReviewedBy,
			ReviewedAt:    reviewedAt,
			CreatedAt:     r.CreatedAt.Unix(),
			UpdatedAt:     r.UpdatedAt.Unix(),
		}
	}
	return result, total, nil
}

func (rr *ReadRepository) GetReport(id string) (*domain.Report, error) {
	type row struct {
		ID            string     `gorm:"column:id"`
		ReporterID    string     `gorm:"column:reporter_id"`
		ReportedID    string     `gorm:"column:reported_id"`
		Reason        string     `gorm:"column:reason"`
		Status        string     `gorm:"column:status"`
		ReviewRemarks string     `gorm:"column:review_remarks"`
		ReviewedBy    string     `gorm:"column:reviewed_by"`
		ReviewedAt    *time.Time `gorm:"column:reviewed_at"`
		CreatedAt     time.Time  `gorm:"column:created_at"`
		UpdatedAt     time.Time  `gorm:"column:updated_at"`
	}

	var r row
	if err := rr.db.Table("user_reports").Where("id = ? AND deleted_at IS NULL", id).Take(&r).Error; err != nil {
		return nil, err
	}

	names := rr.batchUserNames(map[string]struct{}{r.ReporterID: {}, r.ReportedID: {}})

	var reviewedAt *int64
	if r.ReviewedAt != nil {
		ts := r.ReviewedAt.Unix()
		reviewedAt = &ts
	}

	return &domain.Report{
		ID:            r.ID,
		ReporterID:    r.ReporterID,
		ReportedID:    r.ReportedID,
		Reason:        r.Reason,
		Status:        r.Status,
		IsOverdue:     isReportOverdue(r.Status, r.CreatedAt),
		ReporterName:  names[r.ReporterID],
		ReportedName:  names[r.ReportedID],
		ReviewRemarks: r.ReviewRemarks,
		ReviewedBy:    r.ReviewedBy,
		ReviewedAt:    reviewedAt,
		CreatedAt:     r.CreatedAt.Unix(),
		UpdatedAt:     r.UpdatedAt.Unix(),
	}, nil
}

func (rr *ReadRepository) UpdateReportReview(id, status, remarks, reviewedBy string) error {
	now := time.Now()
	updates := map[string]any{
		"status":         status,
		"review_remarks": remarks,
		"reviewed_by":    reviewedBy,
		"reviewed_at":    now,
		"updated_at":     now,
	}
	return rr.db.Table("user_reports").Where("id = ? AND deleted_at IS NULL", id).Updates(updates).Error
}

func (rr *ReadRepository) CountReportsByStatusWithOverdue() (*domain.ReportStatusCounts, error) {
	counts, err := rr.CountReportsByStatus()
	if err != nil {
		return nil, err
	}
	overdue, err := rr.CountOverdueUserReports()
	if err != nil {
		return nil, err
	}
	return &domain.ReportStatusCounts{
		Pending:   counts["pending"],
		Reviewed:  counts["reviewed"],
		Resolved:  counts["resolved"],
		Dismissed: counts["dismissed"],
		Overdue:   overdue,
	}, nil
}

func (rr *ReadRepository) CountReportsByStatus() (map[string]int64, error) {
	type row struct {
		Status string `gorm:"column:status"`
		Count  int64  `gorm:"column:cnt"`
	}

	var rows []row
	if err := rr.db.Table("user_reports").
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

func (rr *ReadRepository) batchUserNames(ids map[string]struct{}) map[string]string {
	if len(ids) == 0 {
		return nil
	}
	type userRow struct {
		ID       string `gorm:"column:id"`
		Username string `gorm:"column:username"`
	}

	var idSlice []string
	for id := range ids {
		idSlice = append(idSlice, id)
	}

	var rows []userRow
	if err := rr.db.Table("users").Select("id, username").Where("id IN ?", idSlice).Find(&rows).Error; err != nil {
		return nil
	}

	result := make(map[string]string, len(rows))
	for _, r := range rows {
		result[r.ID] = r.Username
	}
	return result
}

func (rr *ReadRepository) GetUserBasicInfo(userID string) (username, email, status string, err error) {
	type row struct {
		Username string `gorm:"column:username"`
		Email    string `gorm:"column:email"`
		Status   string `gorm:"column:status"`
	}
	var r row
	if err = rr.db.Table("users").Select("username, email, status").Where("id = ?", userID).Take(&r).Error; err != nil {
		return "", "", "", err
	}
	return r.Username, r.Email, r.Status, nil
}

func (rr *ReadRepository) SuspendUser(userID string) error {
	result := rr.db.Table("users").Where("id = ?", userID).Update("status", "suspended")
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("user not found")
	}
	return nil
}

func (rr *ReadRepository) ActivateUser(userID string) error {
	result := rr.db.Table("users").Where("id = ?", userID).Update("status", "active")
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("user not found")
	}
	return nil
}
