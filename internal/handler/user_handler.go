package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/service"
	"go.uber.org/zap"
)

type UserHandler struct {
	userSvc *service.UserService
	logger  *zap.Logger
}

func NewUserHandler(userSvc *service.UserService, logger *zap.Logger) *UserHandler {
	return &UserHandler{userSvc: userSvc, logger: logger}
}

func (h *UserHandler) List(c *gin.Context) {
	page, pageSize := parsePagination(c)

	query := &domain.UserListQuery{
		Page:     page,
		PageSize: pageSize,
		Search:   c.Query("search"),
		Status:   c.Query("status"),
	}

	users, total, err := h.userSvc.ListUsers(query)
	if err != nil {
		h.logger.Error("failed to list users", zap.Error(err))
		Error(c, CodeInternalError, "failed to list users")
		return
	}
	Paginated(c, users, total, page, pageSize)
}

func (h *UserHandler) Get(c *gin.Context) {
	id := c.Param("id")
	user, err := h.userSvc.GetUser(id)
	if err != nil {
		Error(c, CodeNotFound, "user not found")
		return
	}
	Success(c, user)
}

func (h *UserHandler) StatusCounts(c *gin.Context) {
	counts, err := h.userSvc.StatusCounts()
	if err != nil {
		h.logger.Error("failed to get user status counts", zap.Error(err))
		Error(c, CodeInternalError, "failed to get status counts")
		return
	}
	Success(c, counts)
}

func (h *UserHandler) Suspend(c *gin.Context) {
	id := c.Param("id")
	if err := h.userSvc.SuspendUser(id); err != nil {
		h.logger.Error("failed to suspend user", zap.Error(err), zap.String("userId", id))
		Error(c, CodeInternalError, "failed to suspend user")
		return
	}
	Success(c, nil)
}

func (h *UserHandler) Activate(c *gin.Context) {
	id := c.Param("id")
	if err := h.userSvc.ActivateUser(id); err != nil {
		h.logger.Error("failed to activate user", zap.Error(err), zap.String("userId", id))
		Error(c, CodeInternalError, "failed to activate user")
		return
	}
	Success(c, nil)
}
