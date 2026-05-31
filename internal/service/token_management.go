package service

import (
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/repository/mysql"
	"go.uber.org/zap"
)

type TokenService struct {
	readRepo *mysql.ReadRepository
	logger   *zap.Logger
}

func NewTokenService(readRepo *mysql.ReadRepository, logger *zap.Logger) *TokenService {
	return &TokenService{readRepo: readRepo, logger: logger}
}

func (s *TokenService) List(query *domain.TokenListQuery) ([]*domain.TokenTransactionItem, int64, error) {
	if query.Page < 1 {
		query.Page = 1
	}
	if query.PageSize < 1 || query.PageSize > 100 {
		query.PageSize = 20
	}
	return s.readRepo.ListTokenTransactions(query)
}

func (s *TokenService) Summary() (*domain.TokenSummary, error) {
	return s.readRepo.GetTokenSummary()
}
