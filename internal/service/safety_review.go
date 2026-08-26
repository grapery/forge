package service

import (
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/repository/mysql"
)

type SafetyReviewService struct{ readRepo *mysql.ReadRepository }

func NewSafetyReviewService(r *mysql.ReadRepository) *SafetyReviewService {
	return &SafetyReviewService{readRepo: r}
}
func (s *SafetyReviewService) Assets(q *domain.SafetyAssetQuery) ([]*domain.SafetyAssetItem, int64, error) {
	if q.Page < 1 {
		q.Page = 1
	}
	if q.PageSize < 1 || q.PageSize > 100 {
		q.PageSize = 20
	}
	return s.readRepo.ListSafetyAssets(q)
}
func (s *SafetyReviewService) Conversations(q *domain.SafetyConversationQuery) ([]*domain.SafetyConversationItem, int64, error) {
	if q.Page < 1 {
		q.Page = 1
	}
	if q.PageSize < 1 || q.PageSize > 100 {
		q.PageSize = 20
	}
	return s.readRepo.ListSafetyConversations(q)
}
