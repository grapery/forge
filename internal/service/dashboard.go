package service

import (
	"github.com/grapestree/fgrapery/forge/internal/repository/mysql"
	"go.uber.org/zap"
)

type DashboardService struct {
	readRepo *mysql.ReadRepository
	logger   *zap.Logger
}

func NewDashboardService(readRepo *mysql.ReadRepository, logger *zap.Logger) *DashboardService {
	return &DashboardService{readRepo: readRepo, logger: logger}
}

type OverviewStats struct {
	TotalUsers          int64 `json:"totalUsers"`
	TotalStories        int64 `json:"totalStories"`
	TotalStoryboards    int64 `json:"totalStoryboards"`
	TotalFragments      int64 `json:"totalFragments"`
	TotalCharacters     int64 `json:"totalCharacters"`
	TotalAITasks        int64 `json:"totalAITasks"`
	ActiveMemberships   int64 `json:"activeMemberships"`
	TotalOrders         int64 `json:"totalOrders"`
	TotalTokenTransactions int64 `json:"totalTokenTransactions"`
}

func (s *DashboardService) GetOverview() (*OverviewStats, error) {
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

	return stats, nil
}
