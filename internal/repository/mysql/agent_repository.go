package mysql

import (
	"fmt"

	"github.com/grapestree/fgrapery/forge/internal/domain"
)

func (rr *ReadRepository) ListAgents(query *domain.AgentListQuery) ([]*domain.AgentItem, int64, error) {
	var total int64

	q := rr.db.Table("agents")
	if query.Status != "" {
		q = q.Where("status = ?", query.Status)
	}
	if query.Provider != "" {
		q = q.Where("provider = ?", query.Provider)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count agents: %w", err)
	}

	type row struct {
		ID          string `gorm:"column:id"`
		Name        string `gorm:"column:name"`
		CharacterID string `gorm:"column:character_id"`
		Provider    string `gorm:"column:provider"`
		Model       string `gorm:"column:model"`
		Status      string `gorm:"column:status"`
		CreatedAt   int64  `gorm:"column:created_at"`
		UpdatedAt   int64  `gorm:"column:updated_at"`
	}

	offset := (query.Page - 1) * query.PageSize
	var rows []row
	if err := q.Select("id, name, character_id, provider, model, status, created_at, updated_at").
		Order("created_at DESC").Offset(offset).Limit(query.PageSize).
		Find(&rows).Error; err != nil {
		return nil, 0, fmt.Errorf("list agents: %w", err)
	}

	// Batch resolve character names and author IDs (agents are linked to users via characters)
	charIDs := make([]string, 0, len(rows))
	for _, r := range rows {
		if r.CharacterID != "" {
			charIDs = append(charIDs, r.CharacterID)
		}
	}
	charNames := make(map[string]string)
	charAuthorIDs := make(map[string]string) // characterID -> authorID
	if len(charIDs) > 0 {
		type nameRow struct {
			ID       string `gorm:"column:id"`
			Name     string `gorm:"column:name"`
			AuthorID string `gorm:"column:author_id"`
		}
		var nameRows []nameRow
		rr.db.Table("characters").Select("id, name, author_id").Where("id IN ?", charIDs).Find(&nameRows)
		for _, nr := range nameRows {
			charNames[nr.ID] = nr.Name
			charAuthorIDs[nr.ID] = nr.AuthorID
		}
	}

	// Batch resolve user names (via character.author_id)
	userIDs := make([]string, 0, len(rows))
	for _, r := range rows {
		if aid := charAuthorIDs[r.CharacterID]; aid != "" {
			userIDs = append(userIDs, aid)
		}
	}
	userNames, _ := batchUserNames(rr, userIDs)

	items := make([]*domain.AgentItem, len(rows))
	for i, r := range rows {
		authorID := charAuthorIDs[r.CharacterID]
		items[i] = &domain.AgentItem{
			ID:            r.ID,
			Name:          r.Name,
			CharacterID:   r.CharacterID,
			CharacterName: charNames[r.CharacterID],
			Provider:      r.Provider,
			Model:         r.Model,
			Status:        r.Status,
			UserID:        authorID,
			UserName:      userNames[authorID],
			CreatedAt:     r.CreatedAt,
			UpdatedAt:     r.UpdatedAt,
		}
	}

	return items, total, nil
}

func (rr *ReadRepository) GetAgentDetail(id string) (map[string]any, error) {
	var result map[string]any
	if err := rr.db.Table("agents").Where("id = ?", id).Take(&result).Error; err != nil {
		return nil, fmt.Errorf("get agent detail: %w", err)
	}
	return result, nil
}

func (rr *ReadRepository) ListAgentSkills(agentID string, query *domain.AgentSkillQuery) ([]*domain.AgentSkillItem, int64, error) {
	var total int64

	q := rr.db.Table("agent_skills").Where("agent_id = ?", agentID)

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count agent skills: %w", err)
	}

	type row struct {
		ID          string `gorm:"column:id"`
		AgentID     string `gorm:"column:agent_id"`
		Name        string `gorm:"column:name"`
		Description string `gorm:"column:description"`
		Type        string `gorm:"column:type"`
		CreatedAt   int64  `gorm:"column:created_at"`
	}

	offset := (query.Page - 1) * query.PageSize
	var rows []row
	if err := q.Select("id, agent_id, name, description, type, created_at").
		Order("created_at DESC").Offset(offset).Limit(query.PageSize).
		Find(&rows).Error; err != nil {
		return nil, 0, fmt.Errorf("list agent skills: %w", err)
	}

	items := make([]*domain.AgentSkillItem, len(rows))
	for i, r := range rows {
		items[i] = &domain.AgentSkillItem{
			ID:          r.ID,
			AgentID:     r.AgentID,
			Name:        r.Name,
			Description: r.Description,
			Type:        r.Type,
			CreatedAt:   r.CreatedAt,
		}
	}

	return items, total, nil
}

func (rr *ReadRepository) ListAgentInteractions(agentID string, query *domain.AgentInteractionQuery) ([]*domain.AgentInteractionItem, int64, error) {
	var total int64

	q := rr.db.Table("agent_interactions").Where("agent_id = ?", agentID)

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count agent interactions: %w", err)
	}

	type row struct {
		ID        string `gorm:"column:id"`
		AgentID   string `gorm:"column:agent_id"`
		UserID    string `gorm:"column:user_id"`
		Type      string `gorm:"column:type"`
		Input     string `gorm:"column:input_text"`
		Output    string `gorm:"column:output_text"`
		Tokens    int    `gorm:"column:tokens_used"`
		CreatedAt int64  `gorm:"column:created_at"`
	}

	offset := (query.Page - 1) * query.PageSize
	var rows []row
	if err := q.Select("id, agent_id, user_id, type, input_text, output_text, "+
		"COALESCE(tokens_used, 0) as tokens_used, created_at").
		Order("created_at DESC").Offset(offset).Limit(query.PageSize).
		Find(&rows).Error; err != nil {
		return nil, 0, fmt.Errorf("list agent interactions: %w", err)
	}

	userIDs := make([]string, 0, len(rows))
	for _, r := range rows {
		userIDs = append(userIDs, r.UserID)
	}
	names, _ := batchUserNames(rr, userIDs)

	items := make([]*domain.AgentInteractionItem, len(rows))
	for i, r := range rows {
		items[i] = &domain.AgentInteractionItem{
			ID:        r.ID,
			AgentID:   r.AgentID,
			UserID:    r.UserID,
			UserName:  names[r.UserID],
			Type:      r.Type,
			Input:     r.Input,
			Output:    r.Output,
			Tokens:    r.Tokens,
			CreatedAt: r.CreatedAt,
		}
	}

	return items, total, nil
}

func (rr *ReadRepository) GetAgentStats() (*domain.AgentStats, error) {
	stats := &domain.AgentStats{}

	rr.db.Table("agents").Count(&stats.TotalAgents)
	rr.db.Table("agents").Where("status = ?", "active").Count(&stats.ActiveAgents)
	rr.db.Table("agent_skills").Count(&stats.TotalSkills)
	rr.db.Table("agent_interactions").Count(&stats.TotalInteractions)

	return stats, nil
}

func (wr *WriteRepository) UpdateAgentStatus(id string, status string) error {
	return wr.db.Table("agents").Where("id = ?", id).
		Updates(map[string]any{"status": status, "updated_at": now()}).Error
}
