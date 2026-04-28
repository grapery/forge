package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/service"
	"go.uber.org/zap"
)

type AuditLogHandler struct {
	auditSvc *service.AuditLogService
	logger   *zap.Logger
}

func NewAuditLogHandler(auditSvc *service.AuditLogService, logger *zap.Logger) *AuditLogHandler {
	return &AuditLogHandler{auditSvc: auditSvc, logger: logger}
}

func (h *AuditLogHandler) List(c *gin.Context) {
	page, pageSize := parsePagination(c)

	query := &domain.OperationLogQuery{
		Page:     page,
		PageSize: pageSize,
	}
	query.AdminID = c.Query("adminId")
	query.Action = c.Query("action")
	query.Resource = c.Query("resource")
	if v := c.Query("startDate"); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil {
			query.StartDate = &n
		}
	}
	if v := c.Query("endDate"); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil {
			query.EndDate = &n
		}
	}

	logs, total, err := h.auditSvc.List(query)
	if err != nil {
		Error(c, CodeInternalError, "failed to list audit logs")
		return
	}

	Paginated(c, logs, total, page, pageSize)
}
