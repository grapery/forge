package handler

import (
	"errors"

	"github.com/gin-gonic/gin"
	"github.com/grapestree/fgrapery/forge/internal/auth"
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/service"
	"gorm.io/gorm"
)

type PromptTemplateHandler struct {
	service *service.PromptTemplateService
}

func NewPromptTemplateHandler(promptService *service.PromptTemplateService) *PromptTemplateHandler {
	return &PromptTemplateHandler{service: promptService}
}

func (h *PromptTemplateHandler) List(c *gin.Context) {
	page, pageSize := parsePagination(c)
	items, total, err := h.service.ListDrafts(c.Query("status"), page, pageSize)
	if err != nil {
		h.fail(c, err)
		return
	}
	Paginated(c, items, total, page, pageSize)
}

func (h *PromptTemplateHandler) Get(c *gin.Context) {
	draft, approvals, err := h.service.GetDraft(c.Param("id"))
	if err != nil {
		h.fail(c, err)
		return
	}
	Success(c, gin.H{"draft": draft, "approvals": approvals})
}

func (h *PromptTemplateHandler) Create(c *gin.Context) {
	admin := auth.GetAdminContext(c)
	if admin == nil {
		Error(c, CodeUnauthorized, "unauthorized")
		return
	}
	var req domain.CreatePromptTemplateDraftRequest
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

func (h *PromptTemplateHandler) Update(c *gin.Context) {
	admin := auth.GetAdminContext(c)
	if admin == nil {
		Error(c, CodeUnauthorized, "unauthorized")
		return
	}
	var req domain.UpdatePromptTemplateDraftRequest
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

func (h *PromptTemplateHandler) CloneNextVersion(c *gin.Context) {
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

func (h *PromptTemplateHandler) Submit(c *gin.Context) {
	admin := auth.GetAdminContext(c)
	if admin == nil {
		Error(c, CodeUnauthorized, "unauthorized")
		return
	}
	if err := h.service.Submit(c.Param("id"), admin.AdminID); err != nil {
		h.fail(c, err)
		return
	}
	Success(c, nil)
}

func (h *PromptTemplateHandler) Review(c *gin.Context) {
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
	if err := h.service.Review(c.Param("id"), admin.AdminID, &req); err != nil {
		h.fail(c, err)
		return
	}
	Success(c, nil)
}

func (h *PromptTemplateHandler) Publish(c *gin.Context) {
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

func (h *PromptTemplateHandler) fail(c *gin.Context, err error) {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		Error(c, CodeNotFound, "prompt template not found")
		return
	}
	Error(c, CodeError, err.Error())
}
