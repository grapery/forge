package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/service"
	"go.uber.org/zap"
)

type PromptHandler struct {
	promptSvc *service.PromptService
	logger    *zap.Logger
}

func NewPromptHandler(promptSvc *service.PromptService, logger *zap.Logger) *PromptHandler {
	return &PromptHandler{promptSvc: promptSvc, logger: logger}
}

func (h *PromptHandler) List(c *gin.Context) {
	page, pageSize := parsePagination(c)
	query := &domain.PromptAuditQuery{
		Page:              page,
		PageSize:          pageSize,
		Provider:          c.Query("provider"),
		Model:             c.Query("model"),
		PromptKind:        c.Query("promptKind"),
		RelatedEntityType: c.Query("relatedEntityType"),
	}
	records, total, err := h.promptSvc.ListRecords(query)
	if err != nil {
		h.logger.Error("failed to list prompt audit records", zap.Error(err))
		Error(c, CodeInternalError, "failed to list records")
		return
	}
	Paginated(c, records, total, page, pageSize)
}

func (h *PromptHandler) Get(c *gin.Context) {
	id := c.Param("id")
	record, err := h.promptSvc.GetRecord(id)
	if err != nil {
		Error(c, CodeNotFound, "record not found")
		return
	}
	Success(c, record)
}

func (h *PromptHandler) Summary(c *gin.Context) {
	summary, err := h.promptSvc.Summary()
	if err != nil {
		h.logger.Error("failed to get prompt audit summary", zap.Error(err))
		Error(c, CodeInternalError, "failed to get summary")
		return
	}
	Success(c, summary)
}
