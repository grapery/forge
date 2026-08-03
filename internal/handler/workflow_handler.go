package handler

import (
	"errors"

	"github.com/gin-gonic/gin"
	"github.com/grapestree/fgrapery/forge/internal/auth"
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/opsagent"
	"github.com/grapestree/fgrapery/forge/internal/service"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type WorkflowHandler struct {
	service *service.WorkflowService
	llm     opsagent.LLMConfig
	logger  *zap.Logger
}

func NewWorkflowHandler(workflowService *service.WorkflowService, llm opsagent.LLMConfig, logger *zap.Logger) *WorkflowHandler {
	return &WorkflowHandler{service: workflowService, llm: llm, logger: logger}
}

type generateWorkflowRequest struct {
	Prompt string `json:"prompt" binding:"required"`
}

// Generate turns operator intent into a canonical form payload. It intentionally
// does not persist anything; Workflow Studio keeps the generated content editable.
func (h *WorkflowHandler) Generate(c *gin.Context) {
	var req generateWorkflowRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, CodeInvalidParams, err.Error())
		return
	}
	generated, err := opsagent.GenerateWorkflowDraft(c.Request.Context(), h.llm, req.Prompt)
	if err != nil {
		h.fail(c, err)
		return
	}
	Success(c, generated)
}

func (h *WorkflowHandler) List(c *gin.Context) {
	page, pageSize := parsePagination(c)
	items, total, err := h.service.ListDrafts(c.Query("status"), page, pageSize)
	if err != nil {
		h.fail(c, err)
		return
	}
	Paginated(c, items, total, page, pageSize)
}

func (h *WorkflowHandler) Get(c *gin.Context) {
	draft, approvals, err := h.service.GetDraft(c.Param("id"))
	if err != nil {
		h.fail(c, err)
		return
	}
	Success(c, gin.H{"draft": draft, "approvals": approvals})
}

func (h *WorkflowHandler) Create(c *gin.Context) {
	admin := auth.GetAdminContext(c)
	if admin == nil {
		Error(c, CodeUnauthorized, "unauthorized")
		return
	}
	var req domain.CreateWorkflowDraftRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, CodeInvalidParams, err.Error())
		return
	}
	draft, err := h.service.CreateDraft(&req, admin.AdminID)
	if err != nil {
		h.fail(c, err)
		return
	}
	Success(c, draft)
}

func (h *WorkflowHandler) Update(c *gin.Context) {
	admin := auth.GetAdminContext(c)
	if admin == nil {
		Error(c, CodeUnauthorized, "unauthorized")
		return
	}
	var req domain.UpdateWorkflowDraftRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, CodeInvalidParams, err.Error())
		return
	}
	draft, err := h.service.UpdateDraft(c.Param("id"), &req, admin.AdminID)
	if err != nil {
		h.fail(c, err)
		return
	}
	Success(c, draft)
}

func (h *WorkflowHandler) CloneNextVersion(c *gin.Context) {
	admin := auth.GetAdminContext(c)
	if admin == nil {
		Error(c, CodeUnauthorized, "unauthorized")
		return
	}
	draft, err := h.service.CloneReleasedDraft(c.Param("id"), admin.AdminID)
	if err != nil {
		h.fail(c, err)
		return
	}
	Success(c, draft)
}

func (h *WorkflowHandler) Submit(c *gin.Context) {
	admin := auth.GetAdminContext(c)
	if admin == nil {
		Error(c, CodeUnauthorized, "unauthorized")
		return
	}
	if err := h.service.SubmitForReview(c.Param("id"), admin.AdminID); err != nil {
		h.fail(c, err)
		return
	}
	Success(c, nil)
}

func (h *WorkflowHandler) Review(c *gin.Context) {
	admin := auth.GetAdminContext(c)
	if admin == nil {
		Error(c, CodeUnauthorized, "unauthorized")
		return
	}
	var req domain.ReviewWorkflowRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, CodeInvalidParams, err.Error())
		return
	}
	if err := h.service.Review(c.Param("id"), admin.AdminID, domain.AdminRole(admin.Role), &req); err != nil {
		h.fail(c, err)
		return
	}
	Success(c, nil)
}

func (h *WorkflowHandler) Publish(c *gin.Context) {
	admin := auth.GetAdminContext(c)
	if admin == nil {
		Error(c, CodeUnauthorized, "unauthorized")
		return
	}
	release, err := h.service.Publish(c.Request.Context(), c.Param("id"), admin.AdminID)
	if err != nil {
		h.fail(c, err)
		return
	}
	Success(c, release)
}

func (h *WorkflowHandler) SaveBinding(c *gin.Context) {
	admin := auth.GetAdminContext(c)
	if admin == nil {
		Error(c, CodeUnauthorized, "unauthorized")
		return
	}
	var binding domain.WorkflowBinding
	if err := c.ShouldBindJSON(&binding); err != nil {
		Error(c, CodeInvalidParams, err.Error())
		return
	}
	saved, err := h.service.SaveBinding(c.Request.Context(), &binding, admin.AdminID)
	if err != nil {
		h.fail(c, err)
		return
	}
	Success(c, saved)
}

func (h *WorkflowHandler) ListBindings(c *gin.Context) {
	items, err := h.service.ListBindings(c.Request.Context(), c.Query("surface"), c.Query("action"), c.Query("tenantId"))
	if err != nil {
		h.fail(c, err)
		return
	}
	Success(c, gin.H{"items": items})
}

func (h *WorkflowHandler) fail(c *gin.Context, err error) {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		Error(c, CodeNotFound, "workflow not found")
		return
	}
	h.logger.Warn("workflow operation failed", zap.Error(err))
	Error(c, CodeError, err.Error())
}
