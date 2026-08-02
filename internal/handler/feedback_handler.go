package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/grapestree/fgrapery/forge/internal/auth"
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/service"
	"go.uber.org/zap"
)

type FeedbackHandler struct {
	feedbackSvc *service.FeedbackService
	logger      *zap.Logger
}

func NewFeedbackHandler(feedbackSvc *service.FeedbackService, logger *zap.Logger) *FeedbackHandler {
	return &FeedbackHandler{feedbackSvc: feedbackSvc, logger: logger}
}

func (h *FeedbackHandler) List(c *gin.Context) {
	page, pageSize := parsePagination(c)

	overdue := c.Query("overdue")
	query := &domain.FeedbackListQuery{
		Page:     page,
		PageSize: pageSize,
		Status:   c.Query("status"),
		Category: c.Query("category"),
		UserID:   c.Query("userId"),
		Keyword:  c.Query("keyword"),
		Overdue:  overdue == "1" || overdue == "true",
	}

	items, total, err := h.feedbackSvc.List(query)
	if err != nil {
		Error(c, CodeInternalError, "failed to list feedback")
		return
	}
	Paginated(c, items, total, page, pageSize)
}

func (h *FeedbackHandler) Get(c *gin.Context) {
	id := c.Param("id")
	fb, err := h.feedbackSvc.Get(id)
	if err != nil {
		Error(c, CodeNotFound, "feedback not found")
		return
	}

	Success(c, fb)
}

func (h *FeedbackHandler) Update(c *gin.Context) {
	ctx := auth.GetAdminContext(c)
	if ctx == nil {
		Error(c, CodeUnauthorized, "unauthorized")
		return
	}
	id := c.Param("id")

	var req domain.UpdateFeedbackRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, CodeInvalidParams, err.Error())
		return
	}

	fb, err := h.feedbackSvc.Update(id, &req)
	if err != nil {
		Error(c, CodeError, err.Error())
		return
	}

	Success(c, fb)
}

func (h *FeedbackHandler) StatusCounts(c *gin.Context) {
	counts, err := h.feedbackSvc.StatusCounts()
	if err != nil {
		Error(c, CodeInternalError, "failed to get feedback counts")
		return
	}
	Success(c, counts)
}
