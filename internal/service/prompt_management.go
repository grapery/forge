package service

import (
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/repository/mysql"
)

type PromptService struct {
	readRepo *mysql.ReadRepository
}

func NewPromptService(readRepo *mysql.ReadRepository) *PromptService {
	return &PromptService{readRepo: readRepo}
}

func (s *PromptService) ListRecords(query *domain.PromptAuditQuery) ([]*domain.PromptAuditRecord, int64, error) {
	if query.Page <= 0 {
		query.Page = 1
	}
	if query.PageSize <= 0 || query.PageSize > 100 {
		query.PageSize = 20
	}
	return s.readRepo.ListPromptAuditRecords(query)
}

func (s *PromptService) GetRecord(id string) (*domain.PromptAuditRecord, error) {
	return s.readRepo.GetPromptAuditRecord(id)
}

func (s *PromptService) Summary() (*domain.PromptAuditSummary, error) {
	return s.readRepo.GetPromptAuditSummary()
}
