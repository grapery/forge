package service

import (
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/repository/mysql"
)

type AgentService struct {
	readRepo  *mysql.ReadRepository
	writeRepo *mysql.WriteRepository
}

func NewAgentService(readRepo *mysql.ReadRepository, writeRepo *mysql.WriteRepository) *AgentService {
	return &AgentService{readRepo: readRepo, writeRepo: writeRepo}
}

func (s *AgentService) List(query *domain.AgentListQuery) ([]*domain.AgentItem, int64, error) {
	if query.Page < 1 {
		query.Page = 1
	}
	if query.PageSize < 1 || query.PageSize > 100 {
		query.PageSize = 20
	}
	return s.readRepo.ListAgents(query)
}

func (s *AgentService) GetDetail(id string) (map[string]any, error) {
	return s.readRepo.GetAgentDetail(id)
}

func (s *AgentService) ListSkills(agentID string, query *domain.AgentSkillQuery) ([]*domain.AgentSkillItem, int64, error) {
	if query.Page < 1 {
		query.Page = 1
	}
	if query.PageSize < 1 || query.PageSize > 100 {
		query.PageSize = 20
	}
	return s.readRepo.ListAgentSkills(agentID, query)
}

func (s *AgentService) ListInteractions(agentID string, query *domain.AgentInteractionQuery) ([]*domain.AgentInteractionItem, int64, error) {
	if query.Page < 1 {
		query.Page = 1
	}
	if query.PageSize < 1 || query.PageSize > 100 {
		query.PageSize = 20
	}
	return s.readRepo.ListAgentInteractions(agentID, query)
}

func (s *AgentService) Stats() (*domain.AgentStats, error) {
	return s.readRepo.GetAgentStats()
}

func (s *AgentService) UpdateStatus(id string, req *domain.UpdateAgentStatusRequest) error {
	return s.writeRepo.UpdateAgentStatus(id, req.Status)
}
