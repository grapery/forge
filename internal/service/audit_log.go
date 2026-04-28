package service

import (
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/repository/mysql"
	"go.uber.org/zap"
)

type AuditLogService struct {
	repo   *mysql.Repository
	logger *zap.Logger
}

func NewAuditLogService(repo *mysql.Repository, logger *zap.Logger) *AuditLogService {
	return &AuditLogService{repo: repo, logger: logger}
}

func (s *AuditLogService) Log(entry *domain.AdminOperationLog) {
	if entry.ID == "" {
		entry.ID = newUUID()
	}
	if err := s.repo.CreateOperationLog(entry); err != nil {
		s.logger.Error("failed to write audit log", zap.Error(err))
	}
}

func (s *AuditLogService) List(query *domain.OperationLogQuery) ([]*domain.AdminOperationLog, int64, error) {
	if query.Page < 1 {
		query.Page = 1
	}
	if query.PageSize < 1 || query.PageSize > 100 {
		query.PageSize = 20
	}
	return s.repo.ListOperationLogs(query)
}
