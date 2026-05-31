package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/service"
	"go.uber.org/zap"
)

type AgentHandler struct {
	svc    *service.AgentService
	logger *zap.Logger
}

func NewAgentHandler(svc *service.AgentService, logger *zap.Logger) *AgentHandler {
	return &AgentHandler{svc: svc, logger: logger}
}

func (h *AgentHandler) List(c *gin.Context) {
	page, pageSize := parsePagination(c)
	query := &domain.AgentListQuery{
		Page:     page,
		PageSize: pageSize,
		Status:   c.Query("status"),
		Provider: c.Query("provider"),
	}

	items, total, err := h.svc.List(query)
	if err != nil {
		h.logger.Error("failed to list agents", zap.Error(err))
		Error(c, CodeInternalError, "failed to list agents")
		return
	}
	Paginated(c, items, total, page, pageSize)
}

func (h *AgentHandler) Get(c *gin.Context) {
	id := c.Param("id")
	detail, err := h.svc.GetDetail(id)
	if err != nil {
		Error(c, CodeNotFound, "agent not found")
		return
	}
	Success(c, detail)
}

func (h *AgentHandler) Skills(c *gin.Context) {
	id := c.Param("id")
	page, pageSize := parsePagination(c)
	query := &domain.AgentSkillQuery{
		Page:     page,
		PageSize: pageSize,
	}

	items, total, err := h.svc.ListSkills(id, query)
	if err != nil {
		h.logger.Error("failed to list agent skills", zap.Error(err))
		Error(c, CodeInternalError, "failed to list agent skills")
		return
	}
	Paginated(c, items, total, page, pageSize)
}

func (h *AgentHandler) Interactions(c *gin.Context) {
	id := c.Param("id")
	page, pageSize := parsePagination(c)
	query := &domain.AgentInteractionQuery{
		Page:     page,
		PageSize: pageSize,
	}

	items, total, err := h.svc.ListInteractions(id, query)
	if err != nil {
		h.logger.Error("failed to list agent interactions", zap.Error(err))
		Error(c, CodeInternalError, "failed to list agent interactions")
		return
	}
	Paginated(c, items, total, page, pageSize)
}

func (h *AgentHandler) Stats(c *gin.Context) {
	stats, err := h.svc.Stats()
	if err != nil {
		h.logger.Error("failed to get agent stats", zap.Error(err))
		Error(c, CodeInternalError, "failed to get agent stats")
		return
	}
	Success(c, stats)
}

func (h *AgentHandler) UpdateStatus(c *gin.Context) {
	id := c.Param("id")
	var req domain.UpdateAgentStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, CodeInvalidParams, err.Error())
		return
	}
	if err := h.svc.UpdateStatus(id, &req); err != nil {
		h.logger.Error("failed to update agent status", zap.Error(err))
		Error(c, CodeInternalError, "failed to update agent status")
		return
	}
	Success(c, nil)
}
