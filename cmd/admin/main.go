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
	"github.com/grapestree/fgrapery/forge/internal/repository/mysql"
	"github.com/grapestree/fgrapery/forge/internal/service"
	"go.uber.org/zap"
)

func main() {
	// Load config
	cfg := config.Load()

	// Logger
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

	// JWT
	auth.SetJWTSecret(cfg.JWT.Secret)

	// Database
	db, err := mysql.InitDB(cfg.Database, logger)
	if err != nil {
		logger.Fatal("failed to init database", zap.Error(err))
	}

	repo := mysql.NewRepository(db, logger)
	readRepo := mysql.NewReadRepository(db)
	writeRepo := mysql.NewWriteRepository(db)

	// Auto-migrate admin tables
	if err := repo.AutoMigrate(); err != nil {
		logger.Fatal("failed to auto-migrate", zap.Error(err))
	}

	// Services
	authSvc := service.NewAdminAuthService(repo, logger, cfg.JWT.AccessTokenExp, cfg.JWT.RefreshTokenExp)
	dashSvc := service.NewDashboardService(readRepo, logger)
	auditSvc := service.NewAuditLogService(repo, logger)
	adminUserSvc := service.NewAdminUserMgmtService(repo, logger)
	feedbackSvc := service.NewFeedbackService(readRepo, logger)
	reportSvc := service.NewReportService(readRepo, logger)
	userSvc := service.NewUserService(readRepo, writeRepo)
	contentSvc := service.NewContentService(readRepo, writeRepo)
	topicSvc := service.NewTopicService(readRepo)
	promptSvc := service.NewPromptService(readRepo)
	characterSvc := service.NewCharacterService(readRepo, writeRepo)
	commentSvc := service.NewCommentService(readRepo, writeRepo, logger)
	deletionSvc := service.NewDeletionService(readRepo, writeRepo, logger)
	membershipSvc := service.NewMembershipService(readRepo, logger)
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
	notificationSvc := service.NewNotificationService(readRepo)
	searchSvc := service.NewSearchAnalyticsService(readRepo)

	// Seed default admin
	authSvc.SeedDefaultAdmin()

	// Handlers
	authH := handler.NewAuthHandler(authSvc, auditSvc, logger)
	dashH := handler.NewDashboardHandler(dashSvc, logger)
	adminUserH := handler.NewAdminUserHandler(adminUserSvc, logger)
	auditLogH := handler.NewAuditLogHandler(auditSvc, logger)
	feedbackH := handler.NewFeedbackHandler(feedbackSvc, logger)
	reportH := handler.NewReportHandler(reportSvc, logger)
	userH := handler.NewUserHandler(userSvc, logger)
	contentH := handler.NewContentHandler(contentSvc, logger)
	topicH := handler.NewTopicHandler(topicSvc, logger)
	promptH := handler.NewPromptHandler(promptSvc, logger)
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

	// Router
	router := handler.SetupRouter(authH, dashH, adminUserH, auditLogH, feedbackH, reportH, userH, contentH, topicH, promptH, characterH, commentH, deletionH, membershipH, planH, orderH, tokenH, aiTaskH, aiGenH, agentH, tagH, styleH, genreH, invitationH, deviceH, notificationH, searchH, auditSvc, logger, cfg.AllowOrigins)
	handler.RegisterStaticRoutes(router)

	// HTTP server
	srv := &http.Server{
		Addr:         cfg.Addr(),
		Handler:      router,
		ReadTimeout:  cfg.ReadTimeout,
		WriteTimeout: cfg.WriteTimeout,
		IdleTimeout:  cfg.IdleTimeout,
	}

	// Graceful shutdown
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
