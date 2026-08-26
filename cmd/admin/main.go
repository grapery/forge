package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/grapestree/fgrapery/forge/internal/auth"
	"github.com/grapestree/fgrapery/forge/internal/config"
	"github.com/grapestree/fgrapery/forge/internal/handler"
	"github.com/grapestree/fgrapery/forge/internal/opsagent"
	"github.com/grapestree/fgrapery/forge/internal/repository/mysql"
	"github.com/grapestree/fgrapery/forge/internal/service"
	"go.uber.org/zap"
)

var (
	Version   = "dev"
	CommitSHA = "none"
	BuildTime = "unknown"
)

func main() {
	cfg := config.Load()

	var logger *zap.Logger
	var err error
	if cfg.Env == "production" {
		logger, err = zap.NewProduction()
	} else {
		logger, err = zap.NewDevelopment()
	}
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to init logger: %v\n", err)
		os.Exit(1)
	}
	defer logger.Sync()

	auth.SetJWTSecret(cfg.JWT.Secret)

	// Main business database (read-only for business data)
	mainDB, err := mysql.InitDB(cfg.Database, logger)
	if err != nil {
		logger.Fatal("failed to init main database", zap.Error(err))
	}

	// Forge ops database (admin tables + stats)
	forgeDB, err := mysql.InitDB(cfg.ForgeDB, logger)
	if err != nil {
		logger.Fatal("failed to init forge database", zap.Error(err))
	}

	repo := mysql.NewRepository(forgeDB, logger)
	readRepo := mysql.NewReadRepository(mainDB)
	writeRepo := mysql.NewWriteRepository(mainDB)

	if err := repo.AutoMigrate(); err != nil {
		logger.Fatal("failed to auto-migrate", zap.Error(err))
	}

	// Services
	authSvc := service.NewAdminAuthService(repo, logger, cfg.JWT.AccessTokenExp, cfg.JWT.RefreshTokenExp)
	dashSvc := service.NewDashboardService(readRepo, repo, logger)
	auditSvc := service.NewAuditLogService(repo, logger)
	adminUserSvc := service.NewAdminUserMgmtService(repo, logger)
	feedbackSvc := service.NewFeedbackService(readRepo, writeRepo, logger)
	userSvc := service.NewUserService(readRepo, writeRepo)
	contentSvc := service.NewContentService(readRepo, writeRepo)
	topicSvc := service.NewTopicService(readRepo)
	promptSvc := service.NewPromptService(readRepo)
	workflowPublisher := service.NewGraperyWorkflowPublisher(cfg.WorkflowRuntime)
	workflowSvc := service.NewWorkflowService(repo, workflowPublisher, logger)
	promptTemplateSvc := service.NewPromptTemplateService(repo, workflowPublisher)
	characterSvc := service.NewCharacterService(readRepo, writeRepo)
	commentSvc := service.NewCommentService(readRepo, writeRepo, logger)
	reportSvc := service.NewReportService(readRepo, writeRepo, contentSvc, commentSvc, characterSvc, logger)
	deletionSvc := service.NewDeletionService(readRepo, writeRepo, logger)
	membershipSvc := service.NewMembershipService(mainDB, readRepo, writeRepo, logger)
	planSvc := service.NewPlanService(readRepo, writeRepo, logger)
	orderSvc := service.NewOrderService(readRepo, writeRepo, logger)
	tokenSvc := service.NewTokenService(readRepo, logger)
	aiTaskSvc := service.NewAITaskService(readRepo, writeRepo)
	aiGenSvc := service.NewAIGenerationService(readRepo)
	agentSvc := service.NewAgentService(readRepo, writeRepo)
	tagSvc := service.NewTagService(readRepo, writeRepo)
	styleSvc := service.NewStyleService(readRepo, writeRepo)
	genreSvc := service.NewGenreService(readRepo, writeRepo)
	invitationSvc := service.NewInvitationService(readRepo, writeRepo)
	deviceSvc := service.NewDeviceService(readRepo)
	notificationSvc := service.NewNotificationService(readRepo, writeRepo)
	searchSvc := service.NewSearchAnalyticsService(readRepo)
	shareSvc := service.NewShareAnalyticsService(readRepo)
	safetyReviewSvc := service.NewSafetyReviewService(readRepo)
	collector := service.NewStatsCollector(readRepo, repo, logger)

	authSvc.SeedDefaultAdmin()
	opsLLM := opsagent.LoadLLMConfig()

	// Handlers
	authH := handler.NewAuthHandler(authSvc, auditSvc, logger)
	dashH := handler.NewDashboardHandler(dashSvc, collector, logger)
	adminUserH := handler.NewAdminUserHandler(adminUserSvc, logger)
	auditLogH := handler.NewAuditLogHandler(auditSvc, logger)
	feedbackH := handler.NewFeedbackHandler(feedbackSvc, logger)
	reportH := handler.NewReportHandler(reportSvc, logger)
	userH := handler.NewUserHandler(userSvc, logger)
	contentH := handler.NewContentHandler(contentSvc, logger)
	topicH := handler.NewTopicHandler(topicSvc, logger)
	promptH := handler.NewPromptHandler(promptSvc, logger)
	workflowH := handler.NewWorkflowHandler(workflowSvc, opsLLM, logger)
	promptTemplateH := handler.NewPromptTemplateHandler(promptTemplateSvc)
	characterH := handler.NewCharacterHandler(characterSvc, logger)
	commentH := handler.NewCommentHandler(commentSvc, logger)
	deletionH := handler.NewDeletionHandler(deletionSvc, logger)
	membershipH := handler.NewMembershipHandler(membershipSvc, logger)
	planH := handler.NewPlanHandler(planSvc, logger)
	orderH := handler.NewOrderHandler(orderSvc, logger)
	tokenH := handler.NewTokenHandler(tokenSvc, logger)
	aiTaskH := handler.NewAITaskHandler(aiTaskSvc, logger)
	aiGenH := handler.NewAIGenerationHandler(aiGenSvc, logger)
	agentH := handler.NewAgentHandler(agentSvc, logger)
	tagH := handler.NewTagHandler(tagSvc, logger)
	styleH := handler.NewStyleHandler(styleSvc, logger)
	genreH := handler.NewGenreHandler(genreSvc, logger)
	invitationH := handler.NewInvitationHandler(invitationSvc, logger)
	deviceH := handler.NewDeviceHandler(deviceSvc, logger)
	notificationH := handler.NewNotificationHandler(notificationSvc, logger)
	searchH := handler.NewSearchAnalyticsHandler(searchSvc, logger)
	shareH := handler.NewShareAnalyticsHandler(shareSvc, logger)
	safetyReviewH := handler.NewSafetyReviewHandler(safetyReviewSvc, logger)

	opsReg := opsagent.NewRegistry(opsagent.Deps{
		Dashboard: dashSvc,
		AITask:    aiTaskSvc,
		AIGen:     aiGenSvc,
		Report:    reportSvc,
		Order:     orderSvc,
		Member:    membershipSvc,
		Token:     tokenSvc,
		Audit:     auditSvc,
		Search:    searchSvc,
		Feedback:  feedbackSvc,
		Share:     shareSvc,
		Agent:     agentSvc,
		User:      userSvc,
		Content:   contentSvc,
		Workflow:  workflowSvc,
		LLM:       opsLLM,
	})
	opsSvc := service.NewOpsAssistantService(repo, logger)
	opsH := handler.NewOpsAssistantHandler(opsReg, opsLLM, opsSvc, logger)

	router := handler.SetupRouter(authH, dashH, adminUserH, auditLogH, feedbackH, reportH, userH, contentH, topicH, promptH, characterH, commentH, deletionH, membershipH, planH, orderH, tokenH, aiTaskH, aiGenH, agentH, tagH, styleH, genreH, invitationH, deviceH, notificationH, searchH, shareH, opsH, workflowH, promptTemplateH, safetyReviewH, auditSvc, logger, cfg.AllowOrigins)

	// Daily stats collection (runs at 1:00 AM)
	go startDailyCollector(collector, logger)

	srv := &http.Server{
		Addr:         cfg.Addr(),
		Handler:      router,
		ReadTimeout:  cfg.ReadTimeout,
		WriteTimeout: cfg.WriteTimeout,
		IdleTimeout:  cfg.IdleTimeout,
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	go func() {
		logger.Info("forge admin server starting", zap.String("addr", cfg.Addr()))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("server error", zap.Error(err))
		}
	}()

	<-ctx.Done()
	logger.Info("shutting down...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("server forced shutdown", zap.Error(err))
	}

	logger.Info("server exited")
}

func startDailyCollector(collector *service.StatsCollector, logger *zap.Logger) {
	for {
		now := time.Now()
		next := time.Date(now.Year(), now.Month(), now.Day()+1, 1, 0, 0, 0, now.Location())
		timer := time.NewTimer(next.Sub(now))
		<-timer.C
		if err := collector.Collect(""); err != nil {
			logger.Error("daily stats collection failed", zap.Error(err))
		}
	}
}
