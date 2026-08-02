package service

import (
	"errors"
	"strings"

	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/repository/mysql"
	"go.uber.org/zap"
)

const notificationTypeFeedbackResponse = "feedback_response"

type FeedbackService struct {
	readRepo  *mysql.ReadRepository
	writeRepo *mysql.WriteRepository
	logger    *zap.Logger
}

func NewFeedbackService(readRepo *mysql.ReadRepository, writeRepo *mysql.WriteRepository, logger *zap.Logger) *FeedbackService {
	return &FeedbackService{readRepo: readRepo, writeRepo: writeRepo, logger: logger}
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
		Keyword:  query.Keyword,
		Overdue:  query.Overdue,
	}
	return s.readRepo.ListFeedback(f)
}

func (s *FeedbackService) Get(id string) (*domain.Feedback, error) {
	return s.readRepo.GetFeedback(id)
}

func (s *FeedbackService) Update(id string, req *domain.UpdateFeedbackRequest) (*domain.Feedback, error) {
	prev, err := s.readRepo.GetFeedback(id)
	if err != nil {
		return nil, err
	}

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
	updated, err := s.readRepo.GetFeedback(id)
	if err != nil {
		return nil, err
	}
	updated.UserNotified = s.maybeNotifyFeedbackResponse(prev, updated, hasStatus, hasResponse)
	return updated, nil
}

func (s *FeedbackService) maybeNotifyFeedbackResponse(
	prev, updated *domain.Feedback,
	hasStatus, hasResponse bool,
) bool {
	if s.writeRepo == nil || updated == nil || updated.UserID == "" {
		return false
	}
	resp := strings.TrimSpace(updated.Response)
	if resp == "" {
		return false
	}
	st := strings.ToLower(strings.TrimSpace(updated.Status))
	if st != "resolved" && st != "closed" {
		return false
	}
	responseChanged := hasResponse && strings.TrimSpace(prev.Response) != resp
	statusBecameTerminal := hasStatus && prev.Status != st
	if !responseChanged && !statusBecameTerminal {
		return false
	}

	title := "反馈已回复"
	content := "运营已回复你提交的反馈。"
	if st == "closed" {
		title = "反馈已关闭"
		content = "你的反馈工单已关闭。"
	}
	content += "\n\n回复内容：\n" + resp
	link := "/settings/feedback?id=" + updated.ID
	if err := s.writeRepo.CreateSystemNotification(updated.UserID, notificationTypeFeedbackResponse, title, content, link); err != nil {
		s.logger.Warn("failed to notify user of feedback response",
			zap.String("feedbackId", updated.ID),
			zap.String("userId", updated.UserID),
			zap.Error(err))
		return false
	}
	s.logger.Info("feedback response notification sent",
		zap.String("feedbackId", updated.ID),
		zap.String("userId", updated.UserID))
	return true
}

func (s *FeedbackService) StatusCounts() (*domain.FeedbackStatusCount, error) {
	m, err := s.readRepo.CountFeedbackByStatus()
	if err != nil {
		return nil, err
	}
	counts := &domain.FeedbackStatusCount{
		Received:   m["received"],
		Processing: m["processing"],
		Resolved:   m["resolved"],
		Closed:     m["closed"],
	}

	overdue, critical, err := s.readRepo.CountFeedbackOverdue()
	if err != nil {
		// SLA counts are supplemental; keep status counts usable.
		s.logger.Warn("failed to count overdue feedback", zap.Error(err))
		return counts, nil
	}
	counts.Overdue = overdue
	counts.Critical = critical
	return counts, nil
}
