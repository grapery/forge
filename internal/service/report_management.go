package service

import (
	"errors"

	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/repository/mysql"
	"go.uber.org/zap"
)

type ReportService struct {
	readRepo *mysql.ReadRepository
	logger   *zap.Logger
}

func NewReportService(readRepo *mysql.ReadRepository, logger *zap.Logger) *ReportService {
	return &ReportService{readRepo: readRepo, logger: logger}
}

var validReportStatuses = map[string]bool{
	"pending":   true,
	"reviewed":  true,
	"resolved":  true,
	"dismissed": true,
}

func (s *ReportService) List(query *domain.ReportListQuery) ([]*domain.Report, int64, error) {
	if query.Page < 1 {
		query.Page = 1
	}
	if query.PageSize < 1 || query.PageSize > 100 {
		query.PageSize = 20
	}
	return s.readRepo.ListReports(&mysql.ReportFilter{
		Page:     query.Page,
		PageSize: query.PageSize,
		Status:   query.Status,
	})
}

func (s *ReportService) Get(id string) (*domain.Report, error) {
	return s.readRepo.GetReport(id)
}

func (s *ReportService) Review(id string, req *domain.ReviewReportRequest) (*domain.Report, error) {
	if !validReportStatuses[req.Status] {
		return nil, errors.New("invalid status, must be one of: pending, reviewed, resolved, dismissed")
	}

	report, err := s.readRepo.GetReport(id)
	if err != nil {
		return nil, err
	}

	if report.Status == req.Status {
		return report, nil
	}

	if err := s.readRepo.UpdateReportStatus(id, req.Status); err != nil {
		return nil, err
	}
	return s.readRepo.GetReport(id)
}

func (s *ReportService) StatusCounts() (map[string]int64, error) {
	return s.readRepo.CountReportsByStatus()
}

func (s *ReportService) SuspendUser(userID string) error {
	return s.readRepo.SuspendUser(userID)
}

func (s *ReportService) ActivateUser(userID string) error {
	return s.readRepo.ActivateUser(userID)
}
