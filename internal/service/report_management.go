package service

import (
	"errors"
	"fmt"
	"strings"

	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/repository/mysql"
	"go.uber.org/zap"
)

type ReportService struct {
	readRepo     *mysql.ReadRepository
	writeRepo    *mysql.WriteRepository
	contentSvc   *ContentService
	commentSvc   *CommentService
	characterSvc *CharacterService
	logger       *zap.Logger
}

func NewReportService(
	readRepo *mysql.ReadRepository,
	writeRepo *mysql.WriteRepository,
	contentSvc *ContentService,
	commentSvc *CommentService,
	characterSvc *CharacterService,
	logger *zap.Logger,
) *ReportService {
	return &ReportService{
		readRepo:     readRepo,
		writeRepo:    writeRepo,
		contentSvc:   contentSvc,
		commentSvc:   commentSvc,
		characterSvc: characterSvc,
		logger:       logger,
	}
}

var validReportStatuses = map[string]bool{
	"pending":   true,
	"reviewed":  true,
	"resolved":  true,
	"dismissed": true,
}

func normalizePage(page, pageSize int) (int, int) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	return page, pageSize
}

// --- User reports ---

func (s *ReportService) List(query *domain.ReportListQuery) ([]*domain.Report, int64, error) {
	page, pageSize := normalizePage(query.Page, query.PageSize)
	return s.readRepo.ListReports(&mysql.ReportFilter{
		Page:       page,
		PageSize:   pageSize,
		Status:     query.Status,
		Overdue:    query.Overdue,
		Keyword:    query.Keyword,
		ReporterID: query.ReporterID,
		ReportedID: query.ReportedID,
	})
}

func (s *ReportService) Get(id string) (*domain.Report, error) {
	return s.readRepo.GetReport(id)
}

func (s *ReportService) Review(id string, req *domain.ReviewReportRequest, reviewedBy string) (*domain.Report, error) {
	if !validReportStatuses[req.Status] {
		return nil, errors.New("invalid status, must be one of: pending, reviewed, resolved, dismissed")
	}
	report, err := s.readRepo.GetReport(id)
	if err != nil {
		return nil, err
	}
	if report.Status == req.Status && req.Remarks == report.ReviewRemarks {
		return report, nil
	}
	prevStatus := report.Status
	if err := s.readRepo.UpdateReportReview(id, req.Status, req.Remarks, reviewedBy); err != nil {
		return nil, err
	}
	updated, err := s.readRepo.GetReport(id)
	if err != nil {
		return nil, err
	}
	if prevStatus != updated.Status {
		updated.ReporterNotified = s.notifyReporterOutcome(
			updated.ReporterID,
			updated.Status,
			updated.ReviewRemarks,
			fmt.Sprintf("/users/%s", updated.ReportedID),
			"用户举报",
		)
	}
	return updated, nil
}

func (s *ReportService) StatusCounts() (*domain.ReportStatusCounts, error) {
	return s.readRepo.CountReportsByStatusWithOverdue()
}

func (s *ReportService) SuspendUser(userID string) error {
	return s.writeRepo.SuspendUser(userID)
}

func (s *ReportService) ActivateUser(userID string) error {
	return s.writeRepo.ActivateUser(userID)
}

// --- Content reports ---

func (s *ReportService) ListContentReports(query *domain.ContentReportListQuery) ([]*domain.ContentReport, int64, error) {
	page, pageSize := normalizePage(query.Page, query.PageSize)
	return s.readRepo.ListContentReports(&mysql.ContentReportFilter{
		Page:        page,
		PageSize:    pageSize,
		Status:      query.Status,
		ContentType: query.ContentType,
		Overdue:     query.Overdue,
		Keyword:     query.Keyword,
		ReporterID:  query.ReporterID,
	})
}

func (s *ReportService) GetContentReport(id string) (*domain.ContentReport, error) {
	return s.readRepo.GetContentReport(id)
}

func (s *ReportService) ReviewContentReport(id string, req *domain.ReviewReportRequest, reviewedBy string) (*domain.ContentReport, error) {
	if !validReportStatuses[req.Status] {
		return nil, errors.New("invalid status, must be one of: pending, reviewed, resolved, dismissed")
	}
	report, err := s.readRepo.GetContentReport(id)
	if err != nil {
		return nil, err
	}
	if report.Status == req.Status && req.Remarks == report.ReviewRemarks {
		return report, nil
	}
	prevStatus := report.Status
	if err := s.readRepo.UpdateContentReportReview(id, req.Status, req.Remarks, reviewedBy); err != nil {
		return nil, err
	}
	updated, err := s.readRepo.GetContentReport(id)
	if err != nil {
		return nil, err
	}
	if prevStatus != updated.Status {
		updated.ReporterNotified = s.notifyContentReportOutcome(updated)
	}
	return updated, nil
}

func (s *ReportService) ContentReportStatusCounts() (map[string]int64, error) {
	counts, err := s.readRepo.CountContentReportsByStatus()
	if err != nil {
		return nil, err
	}
	overdue, err := s.readRepo.CountOverdueContentReports()
	if err != nil {
		return nil, err
	}
	if counts == nil {
		counts = make(map[string]int64)
	}
	counts["overdue"] = overdue
	return counts, nil
}

func (s *ReportService) ResolveContentReport(id string, req *domain.ResolveContentReportRequest, reviewedBy string) (*domain.ContentReport, error) {
	if !validReportStatuses[req.Status] {
		return nil, errors.New("invalid status, must be one of: pending, reviewed, resolved, dismissed")
	}

	report, err := s.readRepo.GetContentReport(id)
	if err != nil {
		return nil, err
	}
	// Validate the complete requested action set before executing any mutation.
	// Without this guard, a valid action followed by an invalid one could take
	// content down and then return an error without resolving the report.
	for _, action := range req.Actions {
		switch strings.ToLower(strings.TrimSpace(action)) {
		case "takedown", "suspend_creator":
		default:
			return nil, fmt.Errorf("unsupported action: %s", action)
		}
	}

	for _, action := range req.Actions {
		switch strings.ToLower(strings.TrimSpace(action)) {
		case "takedown":
			if err := s.takedownContent(report.ContentType, report.ContentID); err != nil {
				return nil, fmt.Errorf("takedown failed: %w", err)
			}
		case "suspend_creator":
			if report.CreatorID == "" {
				return nil, errors.New("creator id not found for this content report")
			}
			if err := s.writeRepo.SuspendUser(report.CreatorID); err != nil {
				return nil, fmt.Errorf("suspend creator failed: %w", err)
			}
		}
	}

	prevStatus := report.Status
	if err := s.readRepo.UpdateContentReportReview(id, req.Status, req.Remarks, reviewedBy); err != nil {
		return nil, err
	}
	updated, err := s.readRepo.GetContentReport(id)
	if err != nil {
		return nil, err
	}
	if prevStatus != updated.Status {
		updated.ReporterNotified = s.notifyContentReportOutcome(updated)
	}
	return updated, nil
}

func (s *ReportService) takedownContent(contentType, contentID string) error {
	switch strings.ToLower(contentType) {
	case "story", "storyboard", "fragment":
		return s.contentSvc.Action(contentType, contentID, &domain.ContentActionRequest{Action: "force_delete"})
	case "comment":
		return s.commentSvc.Delete(contentID)
	case "character":
		return s.characterSvc.Action(contentID, &domain.CharacterActionRequest{Action: "force_delete"})
	default:
		return fmt.Errorf("unsupported content type for takedown: %s", contentType)
	}
}

// --- User blocks (read-only) ---

func (s *ReportService) ListBlocks(query *domain.BlockListQuery) ([]*domain.UserBlock, int64, error) {
	page, pageSize := normalizePage(query.Page, query.PageSize)
	return s.readRepo.ListUserBlocks(&mysql.BlockFilter{
		Page:      page,
		PageSize:  pageSize,
		BlockerID: query.BlockerID,
		BlockedID: query.BlockedID,
		Search:    query.Search,
	})
}

func (s *ReportService) GetBlock(id string) (*domain.UserBlock, error) {
	return s.readRepo.GetUserBlock(id)
}

func (s *ReportService) BlockCounts() (*domain.BlockCounts, error) {
	return s.readRepo.CountUserBlocks()
}

// --- Moderation summary for dashboard ---

type ModerationSummary struct {
	PendingUserReports    int64 `json:"pendingUserReports"`
	PendingContentReports int64 `json:"pendingContentReports"`
	OverdueTotal          int64 `json:"overdueTotal"`
}

func (s *ReportService) ModerationSummary() (*ModerationSummary, error) {
	pendingUser, err := s.readRepo.CountPendingUserReports()
	if err != nil {
		return nil, err
	}
	pendingContent, err := s.readRepo.CountPendingContentReports()
	if err != nil {
		return nil, err
	}
	overdue, err := s.readRepo.CountOverdueReportsTotal()
	if err != nil {
		return nil, err
	}
	return &ModerationSummary{
		PendingUserReports:    pendingUser,
		PendingContentReports: pendingContent,
		OverdueTotal:          overdue,
	}, nil
}
