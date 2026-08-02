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

func reviewerFromContext(c *gin.Context) string {
	ctx := auth.GetAdminContext(c)
	if ctx == nil {
		return ""
	}
	return ctx.Username
}

// --- User reports ---

func (h *ReportHandler) List(c *gin.Context) {
	page, pageSize := parsePagination(c)
	query := &domain.ReportListQuery{
		Page:       page,
		PageSize:   pageSize,
		Status:     c.Query("status"),
		Overdue:    c.Query("overdue") == "1" || c.Query("overdue") == "true",
		Keyword:    c.Query("keyword"),
		ReporterID: c.Query("reporterId"),
		ReportedID: c.Query("reportedId"),
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
	if auth.GetAdminContext(c) == nil {
		Error(c, CodeUnauthorized, "unauthorized")
		return
	}
	id := c.Param("id")

	var req domain.ReviewReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, CodeInvalidParams, err.Error())
		return
	}

	report, err := h.reportSvc.Review(id, &req, reviewerFromContext(c))
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
	if auth.GetAdminContext(c) == nil {
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
	if auth.GetAdminContext(c) == nil {
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

// --- Content reports ---

func (h *ReportHandler) ListContentReports(c *gin.Context) {
	page, pageSize := parsePagination(c)
	query := &domain.ContentReportListQuery{
		Page:        page,
		PageSize:    pageSize,
		Status:      c.Query("status"),
		ContentType: c.Query("contentType"),
		Overdue:     c.Query("overdue") == "1" || c.Query("overdue") == "true",
		Keyword:     c.Query("keyword"),
		ReporterID:  c.Query("reporterId"),
	}
	items, total, err := h.reportSvc.ListContentReports(query)
	if err != nil {
		Error(c, CodeInternalError, "failed to list content reports")
		return
	}
	Paginated(c, items, total, page, pageSize)
}

func (h *ReportHandler) GetContentReport(c *gin.Context) {
	id := c.Param("id")
	report, err := h.reportSvc.GetContentReport(id)
	if err != nil {
		Error(c, CodeNotFound, "content report not found")
		return
	}
	Success(c, report)
}

func (h *ReportHandler) ReviewContentReport(c *gin.Context) {
	if auth.GetAdminContext(c) == nil {
		Error(c, CodeUnauthorized, "unauthorized")
		return
	}
	id := c.Param("id")
	var req domain.ReviewReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, CodeInvalidParams, err.Error())
		return
	}
	report, err := h.reportSvc.ReviewContentReport(id, &req, reviewerFromContext(c))
	if err != nil {
		Error(c, CodeError, err.Error())
		return
	}
	Success(c, report)
}

func (h *ReportHandler) ResolveContentReport(c *gin.Context) {
	if auth.GetAdminContext(c) == nil {
		Error(c, CodeUnauthorized, "unauthorized")
		return
	}
	id := c.Param("id")
	var req domain.ResolveContentReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, CodeInvalidParams, err.Error())
		return
	}
	report, err := h.reportSvc.ResolveContentReport(id, &req, reviewerFromContext(c))
	if err != nil {
		Error(c, CodeError, err.Error())
		return
	}
	Success(c, report)
}

func (h *ReportHandler) ContentReportStatusCounts(c *gin.Context) {
	counts, err := h.reportSvc.ContentReportStatusCounts()
	if err != nil {
		Error(c, CodeInternalError, "failed to get content report counts")
		return
	}
	Success(c, counts)
}

// --- User blocks (read-only) ---

func (h *ReportHandler) ListBlocks(c *gin.Context) {
	page, pageSize := parsePagination(c)
	query := &domain.BlockListQuery{
		Page:      page,
		PageSize:  pageSize,
		BlockerID: c.Query("blockerId"),
		BlockedID: c.Query("blockedId"),
		Search:    c.Query("search"),
	}
	items, total, err := h.reportSvc.ListBlocks(query)
	if err != nil {
		Error(c, CodeInternalError, "failed to list blocks")
		return
	}
	Paginated(c, items, total, page, pageSize)
}

func (h *ReportHandler) GetBlock(c *gin.Context) {
	id := c.Param("id")
	block, err := h.reportSvc.GetBlock(id)
	if err != nil {
		Error(c, CodeNotFound, "block not found")
		return
	}
	Success(c, block)
}

func (h *ReportHandler) BlockCounts(c *gin.Context) {
	counts, err := h.reportSvc.BlockCounts()
	if err != nil {
		Error(c, CodeInternalError, "failed to get block counts")
		return
	}
	Success(c, counts)
}

func (h *ReportHandler) ModerationSummary(c *gin.Context) {
	summary, err := h.reportSvc.ModerationSummary()
	if err != nil {
		Error(c, CodeInternalError, "failed to get moderation summary")
		return
	}
	Success(c, summary)
}
