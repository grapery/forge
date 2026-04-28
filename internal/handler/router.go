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

	// Public routes
	authRoutes := api.Group("/auth")
	{
		authRoutes.POST("/login", authH.Login)
		authRoutes.POST("/refresh", authH.Refresh)
	}

	// Protected routes
	protected := api.Group("")
	protected.Use(adminAuth.AuthMiddleware())
	protected.Use(middleware.AuditMiddleware(auditSvc))
	{
		// Auth profile
		protected.GET("/auth/profile", authH.GetProfile)
		protected.PUT("/auth/password", authH.ChangePassword)

		// Dashboard (viewer+)
		dashboard := protected.Group("/dashboard")
		dashboard.Use(middleware.RequireRole("super_admin", "admin", "operator", "viewer"))
		{
			dashboard.GET("/overview", dashH.GetOverview)
		}

		// Admin user management (super_admin only)
		adminUsers := protected.Group("/admin-users")
		adminUsers.Use(middleware.RequireRole("super_admin"))
		{
			adminUsers.GET("", adminUserH.List)
			adminUsers.POST("", adminUserH.Create)
			adminUsers.PUT("/:id", adminUserH.Update)
			adminUsers.PUT("/:id/password-reset", adminUserH.ResetPassword)
			adminUsers.DELETE("/:id", adminUserH.Delete)
		}

		// Feedback management (operator+)
		feedback := protected.Group("/feedback")
		feedback.Use(middleware.RequireRole("super_admin", "admin", "operator"))
		{
			feedback.GET("", feedbackH.List)
			feedback.GET("/counts", feedbackH.StatusCounts)
			feedback.GET("/:id", feedbackH.Get)
			feedback.PUT("/:id", feedbackH.Update)
		}

		// Report management (operator+)
		reports := protected.Group("/reports")
		reports.Use(middleware.RequireRole("super_admin", "admin", "operator"))
		{
			reports.GET("", reportH.List)
			reports.GET("/counts", reportH.StatusCounts)
			reports.GET("/:id", reportH.Get)
			reports.PUT("/:id/review", reportH.Review)
		}

		// User actions from report context (admin+)
		userActions := protected.Group("/users")
		userActions.Use(middleware.RequireRole("super_admin", "admin"))
		{
			userActions.PUT("/:userId/suspend", reportH.SuspendUser)
			userActions.PUT("/:userId/activate", reportH.ActivateUser)
		}

		// Audit log (admin+)
		auditLogs := protected.Group("/operations")
		auditLogs.Use(middleware.RequireRole("super_admin", "admin"))
		{
			auditLogs.GET("/log", auditLogH.List)
		}
	}

	return r
}
