package mysql

import (
	"github.com/grapestree/fgrapery/forge/internal/domain"
)

func (r *Repository) CreateOperationLog(log *domain.AdminOperationLog) error {
	m := &AdminOperationLog{
		ID:          log.ID,
		AdminID:     log.AdminID,
		AdminName:   log.AdminName,
		Action:      log.Action,
		Resource:    log.Resource,
		ResourceID:  log.ResourceID,
		BeforeValue: log.BeforeValue,
		AfterValue:  log.AfterValue,
		IP:          log.IP,
		UserAgent:   log.UserAgent,
	}
	return r.db.Create(m).Error
}

func (r *Repository) ListOperationLogs(query *domain.OperationLogQuery) ([]*domain.AdminOperationLog, int64, error) {
	q := r.db.Model(&AdminOperationLog{})

	if query.AdminID != "" {
		q = q.Where("admin_id = ?", query.AdminID)
	}
	if query.Action != "" {
		q = q.Where("action = ?", query.Action)
	}
	if query.Resource != "" {
		q = q.Where("resource = ?", query.Resource)
	}
	if query.StartDate != nil {
		q = q.Where("created_at >= ?", *query.StartDate)
	}
	if query.EndDate != nil {
		q = q.Where("created_at <= ?", *query.EndDate)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var models []AdminOperationLog
	offset := (query.Page - 1) * query.PageSize
	if err := q.Order("created_at DESC").Offset(offset).Limit(query.PageSize).Find(&models).Error; err != nil {
		return nil, 0, err
	}

	result := make([]*domain.AdminOperationLog, len(models))
	for i := range models {
		result[i] = &domain.AdminOperationLog{
			ID:          models[i].ID,
			AdminID:     models[i].AdminID,
			AdminName:   models[i].AdminName,
			Action:      models[i].Action,
			Resource:    models[i].Resource,
			ResourceID:  models[i].ResourceID,
			BeforeValue: models[i].BeforeValue,
			AfterValue:  models[i].AfterValue,
			IP:          models[i].IP,
			UserAgent:   models[i].UserAgent,
			CreatedAt:   models[i].CreatedAt,
		}
	}
	return result, total, nil
}
