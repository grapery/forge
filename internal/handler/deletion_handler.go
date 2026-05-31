package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/service"
	"go.uber.org/zap"
)

type DeletionHandler struct {
	svc    *service.DeletionService
	logger *zap.Logger
}

func NewDeletionHandler(svc *service.DeletionService, logger *zap.Logger) *DeletionHandler {
	return &DeletionHandler{svc: svc, logger: logger}
}

func (h *DeletionHandler) List(c *gin.Context) {
	page, pageSize := parsePagination(c)
	var query domain.AccountDeletionListQuery
	query.Page = page
	query.PageSize = pageSize
	query.Status = c.Query("status")
	query.UserID = c.Query("userId")

	items, total, err := h.svc.List(&query)
	if err != nil {
		Error(c, CodeInternalError, err.Error())
		return
	}
	Paginated(c, items, total, page, pageSize)
}

func (h *DeletionHandler) Get(c *gin.Context) {
	id := c.Param("id")
	detail, err := h.svc.GetDetail(id)
	if err != nil {
		Error(c, CodeNotFound, "account deletion request not found")
		return
	}
	Success(c, detail)
}

func (h *DeletionHandler) StatusCounts(c *gin.Context) {
	counts, err := h.svc.StatusCounts()
	if err != nil {
		Error(c, CodeInternalError, err.Error())
		return
	}
	Success(c, counts)
}

func (h *DeletionHandler) Action(c *gin.Context) {
	id := c.Param("id")
	var req domain.AccountDeletionActionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, CodeInvalidParams, err.Error())
		return
	}
	if err := h.svc.Action(id, &req); err != nil {
		Error(c, CodeInternalError, err.Error())
		return
	}
	Success(c, nil)
}
