package service

import (
	"fmt"

	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/repository/mysql"
	"go.uber.org/zap"
)

type DeletionService struct {
	readRepo  *mysql.ReadRepository
	writeRepo *mysql.WriteRepository
	logger    *zap.Logger
}

func NewDeletionService(readRepo *mysql.ReadRepository, writeRepo *mysql.WriteRepository, logger *zap.Logger) *DeletionService {
	return &DeletionService{readRepo: readRepo, writeRepo: writeRepo, logger: logger}
}

func (s *DeletionService) List(query *domain.AccountDeletionListQuery) ([]*domain.AccountDeletionItem, int64, error) {
	if query.Page < 1 {
		query.Page = 1
	}
	if query.PageSize < 1 || query.PageSize > 100 {
		query.PageSize = 20
	}
	return s.readRepo.ListAccountDeletions(query)
}

func (s *DeletionService) GetDetail(id string) (map[string]any, error) {
	return s.readRepo.GetAccountDeletionDetail(id)
}

func (s *DeletionService) StatusCounts() (*domain.AccountDeletionStatusCount, error) {
	return s.readRepo.CountAccountDeletionsByStatus()
}

func (s *DeletionService) Action(id string, req *domain.AccountDeletionActionRequest) error {
	switch req.Action {
	case "process":
		return s.writeRepo.ProcessAccountDeletion(id)
	case "complete":
		return s.writeRepo.CompleteAccountDeletion(id)
	case "cancel":
		return s.writeRepo.CancelAccountDeletion(id, req.Reason)
	default:
		return fmt.Errorf("unsupported action: %s", req.Action)
	}
}
