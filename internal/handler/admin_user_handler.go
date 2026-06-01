package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/grapestree/fgrapery/forge/internal/auth"
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/service"
	"go.uber.org/zap"
)

type AdminUserHandler struct {
	mgmtSvc *service.AdminUserMgmtService
	logger  *zap.Logger
}

func NewAdminUserHandler(mgmtSvc *service.AdminUserMgmtService, logger *zap.Logger) *AdminUserHandler {
	return &AdminUserHandler{mgmtSvc: mgmtSvc, logger: logger}
}

func (h *AdminUserHandler) List(c *gin.Context) {
	page, pageSize := parsePagination(c)
	users, total, err := h.mgmtSvc.ListAdminUsers(page, pageSize)
	if err != nil {
		Error(c, CodeInternalError, "failed to list admin users")
		return
	}
	Paginated(c, users, total, page, pageSize)
}

func (h *AdminUserHandler) Create(c *gin.Context) {
	ctx := auth.GetAdminContext(c)
	if ctx == nil {
		Error(c, CodeUnauthorized, "unauthorized")
		return
	}

	var req domain.CreateAdminUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, CodeInvalidParams, err.Error())
		return
	}

	user, err := h.mgmtSvc.CreateAdminUser(&req, domain.AdminRole(ctx.Role))
	if err != nil {
		Error(c, CodeError, err.Error())
		return
	}

	Success(c, user)
}

func (h *AdminUserHandler) Update(c *gin.Context) {
	ctx := auth.GetAdminContext(c)
	if ctx == nil {
		Error(c, CodeUnauthorized, "unauthorized")
		return
	}
	id := c.Param("id")

	var req domain.UpdateAdminUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, CodeInvalidParams, err.Error())
		return
	}

	user, err := h.mgmtSvc.UpdateAdminUser(id, &req, domain.AdminRole(ctx.Role), ctx.AdminID)
	if err != nil {
		Error(c, CodeError, err.Error())
		return
	}

	Success(c, user)
}

func (h *AdminUserHandler) ResetPassword(c *gin.Context) {
	ctx := auth.GetAdminContext(c)
	if ctx == nil {
		Error(c, CodeUnauthorized, "unauthorized")
		return
	}
	id := c.Param("id")

	var req domain.ResetAdminPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, CodeInvalidParams, err.Error())
		return
	}

	if err := h.mgmtSvc.ResetAdminPassword(id, req.NewPassword); err != nil {
		Error(c, CodeError, err.Error())
		return
	}

	Success(c, nil)
}

func (h *AdminUserHandler) Delete(c *gin.Context) {
	ctx := auth.GetAdminContext(c)
	if ctx == nil {
		Error(c, CodeUnauthorized, "unauthorized")
		return
	}
	id := c.Param("id")

	if err := h.mgmtSvc.DeleteAdminUser(id, domain.AdminRole(ctx.Role), ctx.AdminID); err != nil {
		Error(c, CodeError, err.Error())
		return
	}

	Success(c, nil)
}

func (h *AdminUserHandler) GetPermissions(c *gin.Context) {
	id := c.Param("id")
	perms, err := h.mgmtSvc.GetPermissions(id)
	if err != nil {
		Error(c, CodeNotFound, "user not found")
		return
	}
	Success(c, perms)
}

func (h *AdminUserHandler) UpdatePermissions(c *gin.Context) {
	ctx := auth.GetAdminContext(c)
	if ctx == nil {
		Error(c, CodeUnauthorized, "unauthorized")
		return
	}
	id := c.Param("id")

	var req domain.UpdatePermissionsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, CodeInvalidParams, err.Error())
		return
	}

	if err := h.mgmtSvc.UpdatePermissions(id, req.Permissions, domain.AdminRole(ctx.Role), ctx.AdminID); err != nil {
		Error(c, CodeError, err.Error())
		return
	}

	Success(c, nil)
}
