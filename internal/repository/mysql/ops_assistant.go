package mysql

import (
	"errors"

	"github.com/grapestree/fgrapery/forge/internal/domain"
	"gorm.io/gorm"
)

func (r *Repository) CreateOpsSession(s *domain.OpsAssistantSession) error {
	m := &OpsAssistantSession{
		ID:        s.ID,
		AdminID:   s.AdminID,
		Title:     s.Title,
		Status:    s.Status,
		Provider:  s.Provider,
		Model:     s.Model,
		SkillID:   s.SkillID,
		CreatedAt: s.CreatedAt,
		UpdatedAt: s.UpdatedAt,
	}
	if err := r.db.Create(m).Error; err != nil {
		return err
	}
	return nil
}

func (r *Repository) UpdateOpsSession(s *domain.OpsAssistantSession) error {
	return r.db.Model(&OpsAssistantSession{}).Where("id = ? AND admin_id = ?", s.ID, s.AdminID).Updates(map[string]any{
		"title":      s.Title,
		"status":     s.Status,
		"provider":   s.Provider,
		"model":      s.Model,
		"skill_id":   s.SkillID,
		"updated_at": s.UpdatedAt,
	}).Error
}

func (r *Repository) GetOpsSession(id, adminID string) (*domain.OpsAssistantSession, error) {
	var m OpsAssistantSession
	err := r.db.Where("id = ? AND admin_id = ?", id, adminID).Take(&m).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return opsSessionToDomain(&m), nil
}

func (r *Repository) ListOpsSessions(query *domain.OpsAssistantSessionQuery) ([]*domain.OpsAssistantSession, int64, error) {
	q := r.db.Model(&OpsAssistantSession{}).Where("admin_id = ?", query.AdminID)
	if query.Status != "" {
		q = q.Where("status = ?", query.Status)
	} else {
		q = q.Where("status <> ?", "archived")
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	page := query.Page
	if page < 1 {
		page = 1
	}
	pageSize := query.PageSize
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}

	var models []OpsAssistantSession
	if err := q.Order("updated_at DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&models).Error; err != nil {
		return nil, 0, err
	}

	out := make([]*domain.OpsAssistantSession, len(models))
	for i := range models {
		out[i] = opsSessionToDomain(&models[i])
	}
	return out, total, nil
}

func (r *Repository) NextOpsMessageSeq(sessionID string) (int, error) {
	var maxSeq *int
	err := r.db.Model(&OpsAssistantMessage{}).
		Where("session_id = ?", sessionID).
		Select("MAX(seq)").
		Scan(&maxSeq).Error
	if err != nil {
		return 0, err
	}
	if maxSeq == nil {
		return 1, nil
	}
	return *maxSeq + 1, nil
}

func (r *Repository) CreateOpsMessage(msg *domain.OpsAssistantMessage) error {
	m := &OpsAssistantMessage{
		ID:        msg.ID,
		SessionID: msg.SessionID,
		AdminID:   msg.AdminID,
		Role:      msg.Role,
		Content:   msg.Content,
		Seq:       msg.Seq,
		CreatedAt: msg.CreatedAt,
	}
	return r.db.Create(m).Error
}

func (r *Repository) CreateOpsToolCalls(calls []domain.OpsAssistantToolCall) error {
	if len(calls) == 0 {
		return nil
	}
	models := make([]OpsAssistantToolCall, len(calls))
	for i := range calls {
		models[i] = OpsAssistantToolCall{
			ID:           calls[i].ID,
			MessageID:    calls[i].MessageID,
			SessionID:    calls[i].SessionID,
			Name:         calls[i].Name,
			InputJSON:    calls[i].InputJSON,
			OutputJSON:   calls[i].OutputJSON,
			Error:        calls[i].Error,
			CitationJSON: calls[i].CitationJSON,
			CreatedAt:    calls[i].CreatedAt,
		}
	}
	return r.db.Create(&models).Error
}

func (r *Repository) ListOpsMessages(sessionID, adminID string) ([]domain.OpsAssistantMessage, error) {
	var msgs []OpsAssistantMessage
	if err := r.db.Where("session_id = ? AND admin_id = ?", sessionID, adminID).
		Order("seq ASC").Find(&msgs).Error; err != nil {
		return nil, err
	}
	if len(msgs) == 0 {
		return []domain.OpsAssistantMessage{}, nil
	}

	ids := make([]string, len(msgs))
	for i := range msgs {
		ids[i] = msgs[i].ID
	}
	var tools []OpsAssistantToolCall
	_ = r.db.Where("message_id IN ?", ids).Order("created_at ASC").Find(&tools).Error
	byMsg := map[string][]domain.OpsAssistantToolCall{}
	for i := range tools {
		tc := domain.OpsAssistantToolCall{
			ID:           tools[i].ID,
			MessageID:    tools[i].MessageID,
			SessionID:    tools[i].SessionID,
			Name:         tools[i].Name,
			InputJSON:    tools[i].InputJSON,
			OutputJSON:   tools[i].OutputJSON,
			Error:        tools[i].Error,
			CitationJSON: tools[i].CitationJSON,
			CreatedAt:    tools[i].CreatedAt,
		}
		byMsg[tools[i].MessageID] = append(byMsg[tools[i].MessageID], tc)
	}

	out := make([]domain.OpsAssistantMessage, len(msgs))
	for i := range msgs {
		out[i] = domain.OpsAssistantMessage{
			ID:        msgs[i].ID,
			SessionID: msgs[i].SessionID,
			AdminID:   msgs[i].AdminID,
			Role:      msgs[i].Role,
			Content:   msgs[i].Content,
			Seq:       msgs[i].Seq,
			CreatedAt: msgs[i].CreatedAt,
			Tools:     byMsg[msgs[i].ID],
		}
	}
	return out, nil
}

func (r *Repository) ArchiveOpsSession(id, adminID string, updatedAt int64) error {
	res := r.db.Model(&OpsAssistantSession{}).
		Where("id = ? AND admin_id = ?", id, adminID).
		Updates(map[string]any{"status": "archived", "updated_at": updatedAt})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func opsSessionToDomain(m *OpsAssistantSession) *domain.OpsAssistantSession {
	return &domain.OpsAssistantSession{
		ID:        m.ID,
		AdminID:   m.AdminID,
		Title:     m.Title,
		Status:    m.Status,
		Provider:  m.Provider,
		Model:     m.Model,
		SkillID:   m.SkillID,
		CreatedAt: m.CreatedAt,
		UpdatedAt: m.UpdatedAt,
	}
}
