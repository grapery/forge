package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/grapestree/fgrapery/forge/internal/auth"
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/service"
	"go.uber.org/zap"
)

type AuthHandler struct {
	authService *service.AdminAuthService
	auditSvc    *service.AuditLogService
	logger      *zap.Logger
}

func NewAuthHandler(authService *service.AdminAuthService, auditSvc *service.AuditLogService, logger *zap.Logger) *AuthHandler {
	return &AuthHandler{authService: authService, auditSvc: auditSvc, logger: logger}
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req domain.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, CodeInvalidParams, err.Error())
		return
	}

	resp, err := h.authService.Login(&req, clientIP(c))
	if err != nil {
		Error(c, CodeError, err.Error())
		return
	}

	// audit log
	h.auditSvc.Log(&domain.AdminOperationLog{
		AdminID:   resp.User.ID,
		AdminName: resp.User.Username,
		Action:    "login",
		Resource:  "admin_auth",
		IP:        clientIP(c),
		UserAgent: c.GetHeader("User-Agent"),
	})

	Success(c, resp)
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	var req domain.RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, CodeInvalidParams, err.Error())
		return
	}

	resp, err := h.authService.RefreshToken(req.RefreshToken)
	if err != nil {
		Error(c, CodeUnauthorized, err.Error())
		return
	}

	Success(c, resp)
}

func (h *AuthHandler) GetProfile(c *gin.Context) {
	ctx := auth.GetAdminContext(c)
	if ctx == nil {
		Error(c, CodeUnauthorized, "unauthorized")
		return
	}

	admin, err := h.authService.GetProfile(ctx.AdminID)
	if err != nil {
		Error(c, CodeNotFound, "admin not found")
		return
	}

	Success(c, admin)
}

func (h *AuthHandler) ChangePassword(c *gin.Context) {
	ctx := auth.GetAdminContext(c)
	if ctx == nil {
		Error(c, CodeUnauthorized, "unauthorized")
		return
	}

	var req domain.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, CodeInvalidParams, err.Error())
		return
	}

	if err := h.authService.ChangePassword(ctx.AdminID, req.OldPassword, req.NewPassword); err != nil {
		Error(c, CodeError, err.Error())
		return
	}

	h.auditSvc.Log(&domain.AdminOperationLog{
		AdminID:   ctx.AdminID,
		AdminName: ctx.Username,
		Action:    "update",
		Resource:  "admin_password",
		IP:        clientIP(c),
		UserAgent: c.GetHeader("User-Agent"),
	})

	Success(c, nil)
}
