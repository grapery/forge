package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/service"
	"go.uber.org/zap"
)

type ContentHandler struct {
	contentSvc *service.ContentService
	logger     *zap.Logger
}

func NewContentHandler(contentSvc *service.ContentService, logger *zap.Logger) *ContentHandler {
	return &ContentHandler{contentSvc: contentSvc, logger: logger}
}

func (h *ContentHandler) List(c *gin.Context) {
	page, pageSize := parsePagination(c)
	contentType := c.Query("contentType")
	if contentType == "" {
		contentType = "story"
	}

	query := &domain.ContentListQuery{
		Page:        page,
		PageSize:    pageSize,
		ContentType: contentType,
		Search:      c.Query("search"),
		Status:      c.Query("status"),
		AuthorID:    c.Query("authorId"),
		Lineage:     c.Query("lineage"),
		Lifecycle:   c.Query("lifecycle"),
		ReportState: c.Query("reportState"),
	}

	items, total, err := h.contentSvc.ListContent(query)
	if err != nil {
		h.logger.Error("failed to list content", zap.Error(err))
		Error(c, CodeInternalError, "failed to list content")
		return
	}
	Paginated(c, items, total, page, pageSize)
}

func (h *ContentHandler) Get(c *gin.Context) {
	contentType := c.Param("type")
	id := c.Param("id")
	detail, err := h.contentSvc.GetContentDetail(contentType, id)
	if err != nil {
		Error(c, CodeNotFound, "content not found")
		return
	}
	Success(c, detail)
}

func (h *ContentHandler) Action(c *gin.Context) {
	contentType := c.Param("type")
	id := c.Param("id")

	var req domain.ContentActionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, CodeInvalidParams, "invalid request body")
		return
	}

	if err := h.contentSvc.Action(contentType, id, &req); err != nil {
		h.logger.Error("failed to execute content action", zap.Error(err), zap.String("action", req.Action))
		Error(c, CodeInternalError, err.Error())
		return
	}
	Success(c, nil)
}

func (h *ContentHandler) StatusCounts(c *gin.Context) {
	contentType := c.Param("type")
	if contentType == "" {
		contentType = "story"
	}
	counts, err := h.contentSvc.StatusCounts(contentType)
	if err != nil {
		h.logger.Error("failed to get content status counts", zap.Error(err))
		Error(c, CodeInternalError, "failed to get status counts")
		return
	}
	Success(c, counts)
}
