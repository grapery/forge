package handler

import (
	"github.com/gin-gonic/gin"
	adminAuth "github.com/grapestree/fgrapery/forge/internal/auth"
	"github.com/grapestree/fgrapery/forge/internal/middleware"
	"github.com/grapestree/fgrapery/forge/internal/service"
	"go.uber.org/zap"
)

func SetupRouter(
	authH *AuthHandler,
	dashH *DashboardHandler,
	adminUserH *AdminUserHandler,
	auditLogH *AuditLogHandler,
	feedbackH *FeedbackHandler,
	reportH *ReportHandler,
	userH *UserHandler,
	contentH *ContentHandler,
	topicH *TopicHandler,
	promptH *PromptHandler,
	characterH *CharacterHandler,
	commentH *CommentHandler,
	deletionH *DeletionHandler,
	membershipH *MembershipHandler,
	planH *PlanHandler,
	orderH *OrderHandler,
	tokenH *TokenHandler,
	aiTaskH *AITaskHandler,
	aiGenH *AIGenerationHandler,
	agentH *AgentHandler,
	tagH *TagHandler,
	styleH *StyleHandler,
	genreH *GenreHandler,
	invitationH *InvitationHandler,
	deviceH *DeviceHandler,
	notificationH *NotificationHandler,
	searchH *SearchAnalyticsHandler,
	auditSvc *service.AuditLogService,
	logger *zap.Logger,
	allowOrigins []string,
) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.CORS(allowOrigins))
	r.Use(middleware.RequestLogger(logger))

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	api := r.Group("/api/admin")
	authRoutes := api.Group("/auth")
	{
		authRoutes.POST("/login", authH.Login)
		authRoutes.POST("/refresh", authH.Refresh)
	}

	protected := api.Group("")
	protected.Use(adminAuth.AuthMiddleware())
	protected.Use(middleware.AuditMiddleware(auditSvc))
	{
		protected.GET("/auth/profile", authH.GetProfile)
		protected.PUT("/auth/password", authH.ChangePassword)

		dashboard := protected.Group("/dashboard")
		dashboard.Use(middleware.RequireRole("super_admin", "admin", "operator", "viewer"))
		{ dashboard.GET("/overview", dashH.GetOverview) }

		adminUsers := protected.Group("/admin-users")
		adminUsers.Use(middleware.RequireRole("super_admin"))
		{
			adminUsers.GET("", adminUserH.List)
			adminUsers.POST("", adminUserH.Create)
			adminUsers.PUT("/:id", adminUserH.Update)
			adminUsers.PUT("/:id/password-reset", adminUserH.ResetPassword)
			adminUsers.DELETE("/:id", adminUserH.Delete)
		}

		feedback := protected.Group("/feedback")
		feedback.Use(middleware.RequireRole("super_admin", "admin", "operator"))
		{
			feedback.GET("", feedbackH.List)
			feedback.GET("/counts", feedbackH.StatusCounts)
			feedback.GET("/:id", feedbackH.Get)
			feedback.PUT("/:id", feedbackH.Update)
		}

		reports := protected.Group("/reports")
		reports.Use(middleware.RequireRole("super_admin", "admin", "operator"))
		{
			reports.GET("", reportH.List)
			reports.GET("/counts", reportH.StatusCounts)
			reports.GET("/:id", reportH.Get)
			reports.PUT("/:id/review", reportH.Review)
		}

		users := protected.Group("/users")
		users.Use(middleware.RequireRole("super_admin", "admin"))
		{
			users.GET("", userH.List)
			users.GET("/counts", userH.StatusCounts)
			users.GET("/:id", userH.Get)
		}
		protected.PUT("/users/:id/suspend", middleware.RequireRole("super_admin", "admin", "operator"), userH.Suspend)
		protected.PUT("/users/:id/activate", middleware.RequireRole("super_admin", "admin", "operator"), userH.Activate)

		auditLogs := protected.Group("/operations")
		auditLogs.Use(middleware.RequireRole("super_admin", "admin"))
		{ auditLogs.GET("/log", auditLogH.List) }

		content := protected.Group("/content")
		content.Use(middleware.RequireRole("super_admin", "admin"))
		{
			content.GET("", contentH.List)
			content.GET("/:type/counts", contentH.StatusCounts)
			content.GET("/:type/:id", contentH.Get)
			content.PUT("/:type/:id/action", contentH.Action)
		}

		topics := protected.Group("/topics")
		topics.Use(middleware.RequireRole("super_admin", "admin", "operator"))
		{
			topics.GET("", topicH.List)
			topics.GET("/:topic/fragments", topicH.ListFragments)
			topics.GET("/:topic/stories", topicH.ListStories)
		}

		prompts := protected.Group("/prompts")
		prompts.Use(middleware.RequireRole("super_admin", "admin"))
		{
			prompts.GET("/audit", promptH.List)
			prompts.GET("/audit/summary", promptH.Summary)
			prompts.GET("/audit/:id", promptH.Get)
		}

		characters := protected.Group("/characters")
		characters.Use(middleware.RequireRole("super_admin", "admin"))
		{
			characters.GET("", characterH.List)
			characters.GET("/counts", characterH.StatusCounts)
			characters.GET("/:id", characterH.Get)
			characters.PUT("/:id/action", characterH.Action)
		}

		comments := protected.Group("/comments")
		comments.Use(middleware.RequireRole("super_admin", "admin", "operator"))
		{
			comments.GET("", commentH.List)
			comments.GET("/counts", commentH.StatusCounts)
			comments.GET("/:id", commentH.Get)
			comments.DELETE("/:id", commentH.Delete)
		}

		accountDeletions := protected.Group("/account-deletions")
		accountDeletions.Use(middleware.RequireRole("super_admin", "admin"))
		{
			accountDeletions.GET("", deletionH.List)
			accountDeletions.GET("/counts", deletionH.StatusCounts)
			accountDeletions.GET("/:id", deletionH.Get)
			accountDeletions.PUT("/:id/action", deletionH.Action)
		}

		memberships := protected.Group("/memberships")
		memberships.Use(middleware.RequireRole("super_admin", "admin"))
		{
			memberships.GET("", membershipH.List)
			memberships.GET("/summary", membershipH.Summary)
		}

		plans := protected.Group("/plans")
		plans.Use(middleware.RequireRole("super_admin", "admin"))
		{
			plans.GET("", planH.List)
			plans.POST("", planH.Create)
			plans.PUT("/:id", planH.Update)
		}

		orders := protected.Group("/orders")
		orders.Use(middleware.RequireRole("super_admin", "admin"))
		{
			orders.GET("", orderH.List)
			orders.GET("/summary", orderH.Summary)
			orders.GET("/:id", orderH.GetDetail)
			orders.POST("/:id/refund", orderH.Refund)
		}

		tokens := protected.Group("/tokens")
		tokens.Use(middleware.RequireRole("super_admin", "admin"))
		{
			tokens.GET("", tokenH.List)
			tokens.GET("/summary", tokenH.Summary)
		}

		aiTasks := protected.Group("/ai-tasks")
		aiTasks.Use(middleware.RequireRole("super_admin", "admin"))
		{
			aiTasks.GET("", aiTaskH.List)
			aiTasks.GET("/summary", aiTaskH.Summary)
			aiTasks.GET("/:id", aiTaskH.Get)
			aiTasks.POST("/:id/cancel", aiTaskH.Cancel)
		}

		aiGenerations := protected.Group("/ai-generations")
		aiGenerations.Use(middleware.RequireRole("super_admin", "admin"))
		{
			aiGenerations.GET("", aiGenH.List)
			aiGenerations.GET("/summary", aiGenH.Summary)
			aiGenerations.GET("/:id", aiGenH.Get)
		}

		agents := protected.Group("/agents")
		agents.Use(middleware.RequireRole("super_admin", "admin"))
		{
			agents.GET("", agentH.List)
			agents.GET("/:id", agentH.Get)
			agents.GET("/:id/skills", agentH.Skills)
			agents.GET("/:id/interactions", agentH.Interactions)
			agents.GET("/:id/stats", agentH.Stats)
			agents.PUT("/:id/status", agentH.UpdateStatus)
		}

		tags := protected.Group("/tags")
		tags.Use(middleware.RequireRole("super_admin", "admin"))
		{
			tags.GET("", tagH.List)
			tags.GET("/:id", tagH.Get)
			tags.POST("", tagH.Create)
			tags.PUT("/:id", tagH.Update)
			tags.DELETE("/:id", tagH.Delete)
		}

		styles := protected.Group("/styles")
		styles.Use(middleware.RequireRole("super_admin", "admin"))
		{
			styles.GET("", styleH.List)
			styles.GET("/:id", styleH.Get)
			styles.PUT("/:id", styleH.Update)
			styles.DELETE("/:id", styleH.Delete)
		}

		genres := protected.Group("/genres")
		genres.Use(middleware.RequireRole("super_admin", "admin"))
		{
			genres.GET("", genreH.List)
			genres.PUT("/:id", genreH.Update)
		}

		invitations := protected.Group("/invitation-codes")
		invitations.Use(middleware.RequireRole("super_admin", "admin"))
		{
			invitations.GET("", invitationH.ListCodes)
			invitations.POST("", invitationH.CreateCode)
			invitations.PUT("/:id", invitationH.ToggleCode)
		}

		referrals := protected.Group("/referrals")
		referrals.Use(middleware.RequireRole("super_admin", "admin"))
		{ referrals.GET("", invitationH.ListReferrals) }

		devices := protected.Group("/devices")
		devices.Use(middleware.RequireRole("super_admin", "admin"))
		{
			devices.GET("", deviceH.List)
			devices.GET("/counts", deviceH.PlatformCounts)
		}

		notifications := protected.Group("/notifications")
		notifications.Use(middleware.RequireRole("super_admin", "admin"))
		{ notifications.GET("", notificationH.List) }

		search := protected.Group("/search")
		search.Use(middleware.RequireRole("super_admin", "admin"))
		{
			search.GET("/history", searchH.History)
			search.GET("/trends", searchH.Trends)
		}
	}

	return r
}
