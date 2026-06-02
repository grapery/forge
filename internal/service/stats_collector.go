package service

import (
	"time"

	"github.com/grapestree/fgrapery/forge/internal/repository/mysql"
	"go.uber.org/zap"
)

type StatsCollector struct {
	readRepo *mysql.ReadRepository
	repo     *mysql.Repository
	logger   *zap.Logger
}

func NewStatsCollector(readRepo *mysql.ReadRepository, repo *mysql.Repository, logger *zap.Logger) *StatsCollector {
	return &StatsCollector{readRepo: readRepo, repo: repo, logger: logger}
}

func (sc *StatsCollector) Collect(date string) error {
	if date == "" {
		date = time.Now().AddDate(0, 0, -1).Format("2006-01-02")
	}

	parsed, err := time.Parse("2006-01-02", date)
	if err != nil {
		return err
	}
	since := parsed.Unix()

	stat := &mysql.DailyStat{Date: date}

	stat.TotalUsers, _ = sc.readRepo.CountUsers()
	stat.TotalStories, _ = sc.readRepo.CountStories()
	stat.TotalCharacters, _ = sc.readRepo.CountCharacters()
	stat.TotalFragments, _ = sc.readRepo.CountFragments()
	stat.ActiveMemberships, _ = sc.readRepo.CountMemberships()
	stat.TotalOrders, _ = sc.readRepo.CountOrders()
	stat.TotalAITasks, _ = sc.readRepo.CountAITasks()
	stat.TotalTokenTx, _ = sc.readRepo.CountTokenTransactions()

	stat.NewUsers, _ = sc.readRepo.CountNewUsers(since)
	stat.NewStories, _ = sc.readRepo.CountNewStories(since)
	stat.NewCharacters, _ = sc.readRepo.CountNewCharacters(since)
	stat.NewFragments, _ = sc.readRepo.CountNewFragments(since)
	stat.NewOrders, _ = sc.readRepo.CountNewOrders(since)
	stat.NewAITasks, _ = sc.readRepo.CountNewAITasks(since)
	stat.NewTokenTx, _ = sc.readRepo.CountNewTokenTransactions(since)
	stat.NewRevenue, _ = sc.readRepo.SumRevenue(since)

	if prev, err := sc.repo.GetDailyStat(parsed.AddDate(0, 0, -1).Format("2006-01-02")); err == nil {
		stat.TotalRevenue = prev.TotalRevenue + stat.NewRevenue
	} else {
		stat.TotalRevenue = stat.NewRevenue
	}

	if err := sc.repo.UpsertDailyStat(stat); err != nil {
		sc.logger.Error("failed to upsert daily stat", zap.String("date", date), zap.Error(err))
		return err
	}

	sc.logger.Info("daily stats collected",
		zap.String("date", date),
		zap.Int64("newUsers", stat.NewUsers),
		zap.Int64("newStories", stat.NewStories),
		zap.Int64("newOrders", stat.NewOrders),
	)
	return nil
}
