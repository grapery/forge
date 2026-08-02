package service

import (
	"github.com/grapestree/fgrapery/forge/internal/repository/mysql"
	"go.uber.org/zap"
)

type DashboardService struct {
	readRepo *mysql.ReadRepository
	repo     *mysql.Repository
	logger   *zap.Logger
}

func NewDashboardService(readRepo *mysql.ReadRepository, repo *mysql.Repository, logger *zap.Logger) *DashboardService {
	return &DashboardService{readRepo: readRepo, repo: repo, logger: logger}
}

type OverviewStats struct {
	TotalUsers             int64        `json:"totalUsers"`
	TotalStories           int64        `json:"totalStories"`
	TotalStoryboards       int64        `json:"totalStoryboards"`
	TotalFragments         int64        `json:"totalFragments"`
	TotalCharacters        int64        `json:"totalCharacters"`
	TotalAITasks           int64        `json:"totalAITasks"`
	ActiveMemberships      int64        `json:"activeMemberships"`
	TotalOrders            int64        `json:"totalOrders"`
	TotalTokenTransactions int64        `json:"totalTokenTransactions"`
	PendingUserReports     int64        `json:"pendingUserReports"`
	PendingContentReports  int64        `json:"pendingContentReports"`
	OverdueReportsTotal    int64        `json:"overdueReportsTotal"`
	OpenFeedback           int64        `json:"openFeedback"`
	OverdueFeedback        int64        `json:"overdueFeedback"`
	CriticalFeedback       int64        `json:"criticalFeedback"`
	Trends                 []DailyTrend `json:"trends"`
}

type DailyTrend struct {
	Date             string  `json:"date"`
	TotalUsers       int64   `json:"totalUsers"`
	NewUsers         int64   `json:"newUsers"`
	TotalStories     int64   `json:"totalStories"`
	NewStories       int64   `json:"newStories"`
	TotalCharacters  int64   `json:"totalCharacters"`
	NewCharacters    int64   `json:"newCharacters"`
	TotalOrders      int64   `json:"totalOrders"`
	NewOrders        int64   `json:"newOrders"`
	NewRevenue       float64 `json:"newRevenue"`
	TotalAITasks     int64   `json:"totalAITasks"`
	NewAITasks       int64   `json:"newAITasks"`
	TotalFragments   int64   `json:"totalFragments"`
	NewFragments     int64   `json:"newFragments"`
	TotalStoryboards int64   `json:"totalStoryboards"`
	NewStoryboards   int64   `json:"newStoryboards"`
	ForkEvents       int64   `json:"forkEvents"`
	TokenConsumed    int64   `json:"tokenConsumed"`
}

func (s *DashboardService) GetOverview(trendDays int) (*OverviewStats, error) {
	if trendDays <= 0 {
		trendDays = 30
	}
	stats := &OverviewStats{}
	var err error

	stats.TotalUsers, err = s.readRepo.CountUsers()
	if err != nil {
		s.logger.Warn("failed to count users", zap.Error(err))
	}

	stats.TotalStories, err = s.readRepo.CountStories()
	if err != nil {
		s.logger.Warn("failed to count stories", zap.Error(err))
	}

	stats.TotalStoryboards, err = s.readRepo.CountStoryboards()
	if err != nil {
		s.logger.Warn("failed to count storyboards", zap.Error(err))
	}

	stats.TotalFragments, err = s.readRepo.CountFragments()
	if err != nil {
		s.logger.Warn("failed to count fragments", zap.Error(err))
	}

	stats.TotalCharacters, err = s.readRepo.CountCharacters()
	if err != nil {
		s.logger.Warn("failed to count characters", zap.Error(err))
	}

	stats.TotalAITasks, err = s.readRepo.CountAITasks()
	if err != nil {
		s.logger.Warn("failed to count AI tasks", zap.Error(err))
	}

	stats.ActiveMemberships, err = s.readRepo.CountMemberships()
	if err != nil {
		s.logger.Warn("failed to count memberships", zap.Error(err))
	}

	stats.TotalOrders, err = s.readRepo.CountOrders()
	if err != nil {
		s.logger.Warn("failed to count orders", zap.Error(err))
	}

	stats.TotalTokenTransactions, err = s.readRepo.CountTokenTransactions()
	if err != nil {
		s.logger.Warn("failed to count token transactions", zap.Error(err))
	}

	stats.PendingUserReports, err = s.readRepo.CountPendingUserReports()
	if err != nil {
		s.logger.Warn("failed to count pending user reports", zap.Error(err))
	}
	stats.PendingContentReports, err = s.readRepo.CountPendingContentReports()
	if err != nil {
		s.logger.Warn("failed to count pending content reports", zap.Error(err))
	}
	stats.OverdueReportsTotal, err = s.readRepo.CountOverdueReportsTotal()
	if err != nil {
		s.logger.Warn("failed to count overdue reports", zap.Error(err))
	}

	if byStatus, ferr := s.readRepo.CountFeedbackByStatus(); ferr != nil {
		s.logger.Warn("failed to count feedback by status", zap.Error(ferr))
	} else {
		stats.OpenFeedback = byStatus["received"] + byStatus["processing"]
	}
	if overdue, critical, ferr := s.readRepo.CountFeedbackOverdue(); ferr != nil {
		s.logger.Warn("failed to count overdue feedback", zap.Error(ferr))
	} else {
		stats.OverdueFeedback = overdue
		stats.CriticalFeedback = critical
	}

	dailyStats, err := s.repo.GetLatestStats(trendDays)
	if err != nil {
		s.logger.Warn("failed to load daily trends", zap.Error(err))
	} else {
		trends := make([]DailyTrend, 0, len(dailyStats))
		for i := len(dailyStats) - 1; i >= 0; i-- {
			d := dailyStats[i]
			trends = append(trends, DailyTrend{
				Date:             d.Date,
				TotalUsers:       d.TotalUsers,
				NewUsers:         d.NewUsers,
				TotalStories:     d.TotalStories,
				NewStories:       d.NewStories,
				TotalCharacters:  d.TotalCharacters,
				NewCharacters:    d.NewCharacters,
				TotalOrders:      d.TotalOrders,
				NewOrders:        d.NewOrders,
				NewRevenue:       d.NewRevenue,
				TotalAITasks:     d.TotalAITasks,
				NewAITasks:       d.NewAITasks,
				TotalFragments:   d.TotalFragments,
				NewFragments:     d.NewFragments,
				TotalStoryboards: d.TotalStoryboards,
				NewStoryboards:   d.NewStoryboards,
				ForkEvents:       d.ForkEvents,
				TokenConsumed:    d.TokenConsumed,
			})
		}
		stats.Trends = trends
	}

	return stats, nil
}
