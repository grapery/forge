package service

import (
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/repository/mysql"
	"go.uber.org/zap"
)

type CommentService struct {
	readRepo  *mysql.ReadRepository
	writeRepo *mysql.WriteRepository
	logger    *zap.Logger
}

func NewCommentService(readRepo *mysql.ReadRepository, writeRepo *mysql.WriteRepository, logger *zap.Logger) *CommentService {
	return &CommentService{readRepo: readRepo, writeRepo: writeRepo, logger: logger}
}

func (s *CommentService) List(query *domain.CommentListQuery) ([]*domain.CommentItem, int64, error) {
	if query.Page < 1 {
		query.Page = 1
	}
	if query.PageSize < 1 || query.PageSize > 100 {
		query.PageSize = 20
	}
	return s.readRepo.ListComments(query)
}

func (s *CommentService) GetDetail(id string) (map[string]any, error) {
	return s.readRepo.GetCommentDetail(id)
}

func (s *CommentService) StatusCounts() (*domain.CommentStatusCount, error) {
	return s.readRepo.CountCommentsByTargetType()
}

func (s *CommentService) Delete(id string) error {
	return s.writeRepo.DeleteComment(id)
}
