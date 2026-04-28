package service

import (
	"errors"

	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/repository/mysql"
	"go.uber.org/zap"
)

type FeedbackService struct {
	readRepo *mysql.ReadRepository
	logger   *zap.Logger
}

func NewFeedbackService(readRepo *mysql.ReadRepository, logger *zap.Logger) *FeedbackService {
	return &FeedbackService{readRepo: readRepo, logger: logger}
}

func (s *FeedbackService) List(query *domain.FeedbackListQuery) ([]*domain.Feedback, int64, error) {
	if query.Page < 1 {
		query.Page = 1
	}
	if query.PageSize < 1 || query.PageSize > 100 {
		query.PageSize = 20
	}

	f := &mysql.FeedbackFilter{
		Page:     query.Page,
		PageSize: query.PageSize,
		Status:   query.Status,
		Category: query.Category,
		UserID:   query.UserID,
	}
	return s.readRepo.ListFeedback(f)
}

func (s *FeedbackService) Get(id string) (*domain.Feedback, error) {
	return s.readRepo.GetFeedback(id)
}

func (s *FeedbackService) Update(id string, req *domain.UpdateFeedbackRequest) (*domain.Feedback, error) {
	status := ""
	response := ""
	hasStatus := false
	hasResponse := false
	if req.Status != nil {
		validStatuses := map[string]bool{"received": true, "processing": true, "resolved": true, "closed": true}
		if !validStatuses[*req.Status] {
			return nil, errors.New("invalid status value")
		}
		status = *req.Status
		hasStatus = true
	}
	if req.Response != nil {
		response = *req.Response
		hasResponse = true
	}
	if err := s.readRepo.UpdateFeedback(id, status, response, hasStatus, hasResponse); err != nil {
		return nil, err
	}
	return s.readRepo.GetFeedback(id)
}

func (s *FeedbackService) StatusCounts() (*domain.FeedbackStatusCount, error) {
	m, err := s.readRepo.CountFeedbackByStatus()
	if err != nil {
		return nil, err
	}
	return &domain.FeedbackStatusCount{
		Received:   m["received"],
		Processing: m["processing"],
		Resolved:   m["resolved"],
		Closed:     m["closed"],
	}, nil
}
