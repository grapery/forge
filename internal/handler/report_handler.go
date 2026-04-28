package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/grapestree/fgrapery/forge/internal/auth"
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/service"
	"go.uber.org/zap"
)

type ReportHandler struct {
	reportSvc *service.ReportService
	logger    *zap.Logger
}

func NewReportHandler(reportSvc *service.ReportService, logger *zap.Logger) *ReportHandler {
	return &ReportHandler{reportSvc: reportSvc, logger: logger}
}

func (h *ReportHandler) List(c *gin.Context) {
	page, pageSize := parsePagination(c)
	query := &domain.ReportListQuery{
		Page:     page,
		PageSize: pageSize,
		Status:   c.Query("status"),
	}

	items, total, err := h.reportSvc.List(query)
	if err != nil {
		Error(c, CodeInternalError, "failed to list reports")
		return
	}
	Paginated(c, items, total, page, pageSize)
}

func (h *ReportHandler) Get(c *gin.Context) {
	id := c.Param("id")
	report, err := h.reportSvc.Get(id)
	if err != nil {
		Error(c, CodeNotFound, "report not found")
		return
	}
	Success(c, report)
}

func (h *ReportHandler) Review(c *gin.Context) {
	ctx := auth.GetAdminContext(c)
	if ctx == nil {
		Error(c, CodeUnauthorized, "unauthorized")
		return
	}
	id := c.Param("id")

	var req domain.ReviewReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, CodeInvalidParams, err.Error())
		return
	}

	report, err := h.reportSvc.Review(id, &req)
	if err != nil {
		Error(c, CodeError, err.Error())
		return
	}

	Success(c, report)
}

func (h *ReportHandler) StatusCounts(c *gin.Context) {
	counts, err := h.reportSvc.StatusCounts()
	if err != nil {
		Error(c, CodeInternalError, "failed to get report counts")
		return
	}
	Success(c, counts)
}

func (h *ReportHandler) SuspendUser(c *gin.Context) {
	ctx := auth.GetAdminContext(c)
	if ctx == nil {
		Error(c, CodeUnauthorized, "unauthorized")
		return
	}
	userID := c.Param("userId")

	if err := h.reportSvc.SuspendUser(userID); err != nil {
		Error(c, CodeError, err.Error())
		return
	}

	Success(c, gin.H{"message": "user suspended"})
}

func (h *ReportHandler) ActivateUser(c *gin.Context) {
	ctx := auth.GetAdminContext(c)
	if ctx == nil {
		Error(c, CodeUnauthorized, "unauthorized")
		return
	}
	userID := c.Param("userId")

	if err := h.reportSvc.ActivateUser(userID); err != nil {
		Error(c, CodeError, err.Error())
		return
	}

	Success(c, gin.H{"message": "user activated"})
}
