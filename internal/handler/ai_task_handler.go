package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/service"
	"go.uber.org/zap"
)

type AITaskHandler struct {
	svc    *service.AITaskService
	logger *zap.Logger
}

func NewAITaskHandler(svc *service.AITaskService, logger *zap.Logger) *AITaskHandler {
	return &AITaskHandler{svc: svc, logger: logger}
}

func (h *AITaskHandler) List(c *gin.Context) {
	page, pageSize := parsePagination(c)
	query := &domain.AITaskListQuery{
		Page:     page,
		PageSize: pageSize,
		Type:     c.Query("type"),
		Status:   c.Query("status"),
		Provider: c.Query("provider"),
		Model:    c.Query("model"),
		UserID:   c.Query("userId"),
		DateFrom: c.Query("dateFrom"),
		DateTo:   c.Query("dateTo"),
	}

	items, total, err := h.svc.List(query)
	if err != nil {
		h.logger.Error("failed to list ai tasks", zap.Error(err))
		Error(c, CodeInternalError, "failed to list ai tasks")
		return
	}
	Paginated(c, items, total, page, pageSize)
}

func (h *AITaskHandler) Get(c *gin.Context) {
	id := c.Param("id")
	detail, err := h.svc.GetDetail(id)
	if err != nil {
		Error(c, CodeNotFound, "ai task not found")
		return
	}
	Success(c, detail)
}

func (h *AITaskHandler) Summary(c *gin.Context) {
	summary, err := h.svc.Summary()
	if err != nil {
		h.logger.Error("failed to get ai task summary", zap.Error(err))
		Error(c, CodeInternalError, "failed to get summary")
		return
	}
	Success(c, summary)
}

func (h *AITaskHandler) Cancel(c *gin.Context) {
	id := c.Param("id")
	if err := h.svc.Cancel(id); err != nil {
		h.logger.Error("failed to cancel ai task", zap.Error(err))
		Error(c, CodeInternalError, "failed to cancel ai task")
		return
	}
	Success(c, nil)
}

type AIGenerationHandler struct {
	svc    *service.AIGenerationService
	logger *zap.Logger
}

func NewAIGenerationHandler(svc *service.AIGenerationService, logger *zap.Logger) *AIGenerationHandler {
	return &AIGenerationHandler{svc: svc, logger: logger}
}

func (h *AIGenerationHandler) List(c *gin.Context) {
	page, pageSize := parsePagination(c)
	dateTo := c.Query("dateTo")
	if dateTo != "" && len(dateTo) == 10 {
		dateTo = dateTo + " 23:59:59"
	}
	query := &domain.AIGenerationListQuery{
		Page:              page,
		PageSize:          pageSize,
		Type:              c.Query("type"),
		Status:            c.Query("status"),
		Provider:          c.Query("provider"),
		Model:             c.Query("model"),
		UserID:            c.Query("userId"),
		DateFrom:          c.Query("dateFrom"),
		DateTo:            dateTo,
		Keyword:           c.Query("keyword"),
		RelatedEntityType: c.Query("relatedEntityType"),
	}

	items, total, err := h.svc.List(query)
	if err != nil {
		h.logger.Error("failed to list ai generation records", zap.Error(err))
		Error(c, CodeInternalError, "failed to list generation records")
		return
	}
	Paginated(c, items, total, page, pageSize)
}

func (h *AIGenerationHandler) Get(c *gin.Context) {
	id := c.Param("id")
	detail, err := h.svc.GetDetail(id)
	if err != nil {
		Error(c, CodeNotFound, "generation record not found")
		return
	}
	Success(c, detail)
}

func (h *AIGenerationHandler) Summary(c *gin.Context) {
	summary, err := h.svc.Summary()
	if err != nil {
		h.logger.Error("failed to get ai generation summary", zap.Error(err))
		Error(c, CodeInternalError, "failed to get summary")
		return
	}
	Success(c, summary)
}
