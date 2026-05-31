package service

import (
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/repository/mysql"
)

type AITaskService struct {
	readRepo  *mysql.ReadRepository
	writeRepo *mysql.WriteRepository
}

func NewAITaskService(readRepo *mysql.ReadRepository, writeRepo *mysql.WriteRepository) *AITaskService {
	return &AITaskService{readRepo: readRepo, writeRepo: writeRepo}
}

func (s *AITaskService) List(query *domain.AITaskListQuery) ([]*domain.AITaskItem, int64, error) {
	if query.Page < 1 {
		query.Page = 1
	}
	if query.PageSize < 1 || query.PageSize > 100 {
		query.PageSize = 20
	}
	return s.readRepo.ListAITasks(query)
}

func (s *AITaskService) GetDetail(id string) (map[string]any, error) {
	return s.readRepo.GetAITaskDetail(id)
}

func (s *AITaskService) Summary() (*domain.AITaskSummary, error) {
	return s.readRepo.GetAITaskSummary()
}

func (s *AITaskService) Cancel(id string) error {
	return s.writeRepo.CancelAITask(id)
}

type AIGenerationService struct {
	readRepo *mysql.ReadRepository
}

func NewAIGenerationService(readRepo *mysql.ReadRepository) *AIGenerationService {
	return &AIGenerationService{readRepo: readRepo}
}

func (s *AIGenerationService) List(query *domain.AIGenerationListQuery) ([]*domain.AIGenerationRecordItem, int64, error) {
	if query.Page < 1 {
		query.Page = 1
	}
	if query.PageSize < 1 || query.PageSize > 100 {
		query.PageSize = 20
	}
	return s.readRepo.ListAIGenerationRecords(query)
}

func (s *AIGenerationService) GetDetail(id string) (map[string]any, error) {
	return s.readRepo.GetAIGenerationDetail(id)
}

func (s *AIGenerationService) Summary() (*domain.AIGenerationSummary, error) {
	return s.readRepo.GetAIGenerationSummary()
}
