package mysql

import (
	"fmt"

	"github.com/grapestree/fgrapery/forge/internal/domain"
)

type ReportFilter struct {
	Page     int
	PageSize int
	Status   string
}

// ListReports returns paginated user_reports with optional status filter.
func (rr *ReadRepository) ListReports(f *ReportFilter) ([]*domain.Report, int64, error) {
	q := rr.db.Table("user_reports").Where("deleted_at IS NULL")

	if f.Status != "" {
		q = q.Where("status = ?", f.Status)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	type row struct {
		ID         string `gorm:"column:id"`
		ReporterID string `gorm:"column:reporter_id"`
		ReportedID string `gorm:"column:reported_id"`
		Reason     string `gorm:"column:reason"`
		Status     string `gorm:"column:status"`
		CreatedAt  string `gorm:"column:created_at"`
		UpdatedAt  string `gorm:"column:updated_at"`
	}

	var rows []row
	offset := (f.Page - 1) * f.PageSize
	if err := q.Order("created_at DESC").Offset(offset).Limit(f.PageSize).Find(&rows).Error; err != nil {
		return nil, 0, err
	}

	// Collect unique user IDs for batch lookup
	userIDSet := make(map[string]struct{})
	for _, r := range rows {
		userIDSet[r.ReporterID] = struct{}{}
		userIDSet[r.ReportedID] = struct{}{}
	}
	userNames := rr.batchUserNames(userIDSet)

	result := make([]*domain.Report, len(rows))
	for i, r := range rows {
		result[i] = &domain.Report{
			ID:           r.ID,
			ReporterID:   r.ReporterID,
			ReportedID:   r.ReportedID,
			Reason:       r.Reason,
			Status:       r.Status,
			ReporterName: userNames[r.ReporterID],
			ReportedName: userNames[r.ReportedID],
			CreatedAt:    r.CreatedAt,
			UpdatedAt:    r.UpdatedAt,
		}
	}
	return result, total, nil
}

// GetReport returns a single report by ID with user names.
func (rr *ReadRepository) GetReport(id string) (*domain.Report, error) {
	type row struct {
		ID         string `gorm:"column:id"`
		ReporterID string `gorm:"column:reporter_id"`
		ReportedID string `gorm:"column:reported_id"`
		Reason     string `gorm:"column:reason"`
		Status     string `gorm:"column:status"`
		CreatedAt  string `gorm:"column:created_at"`
		UpdatedAt  string `gorm:"column:updated_at"`
	}

	var r row
	if err := rr.db.Table("user_reports").Where("id = ? AND deleted_at IS NULL", id).Take(&r).Error; err != nil {
		return nil, err
	}

	names := rr.batchUserNames(map[string]struct{}{r.ReporterID: {}, r.ReportedID: {}})

	return &domain.Report{
		ID:           r.ID,
		ReporterID:   r.ReporterID,
		ReportedID:   r.ReportedID,
		Reason:       r.Reason,
		Status:       r.Status,
		ReporterName: names[r.ReporterID],
		ReportedName: names[r.ReportedID],
		CreatedAt:    r.CreatedAt,
		UpdatedAt:    r.UpdatedAt,
	}, nil
}

// UpdateReportStatus updates the status of a report.
func (rr *ReadRepository) UpdateReportStatus(id, status string) error {
	return rr.db.Table("user_reports").Where("id = ? AND deleted_at IS NULL", id).
		Update("status", status).Error
}

// CountReportsByStatus returns counts grouped by status.
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

// batchUserNames returns a map of userID -> username for given IDs.
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

// GetUserBasicInfo returns basic info for a user (for admin detail view).
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

// SuspendUser sets user status to "suspended".
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

// ActivateUser sets user status to "active".
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
