package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/service"
	"go.uber.org/zap"
)

type CommentHandler struct {
	svc    *service.CommentService
	logger *zap.Logger
}

func NewCommentHandler(svc *service.CommentService, logger *zap.Logger) *CommentHandler {
	return &CommentHandler{svc: svc, logger: logger}
}

func (h *CommentHandler) List(c *gin.Context) {
	page, pageSize := parsePagination(c)
	var query domain.CommentListQuery
	query.Page = page
	query.PageSize = pageSize
	query.TargetType = c.Query("targetType")
	query.TargetID = c.Query("targetId")
	query.AuthorID = c.Query("authorId")
	query.Search = c.Query("search")

	items, total, err := h.svc.List(&query)
	if err != nil {
		Error(c, CodeInternalError, err.Error())
		return
	}
	Paginated(c, items, total, page, pageSize)
}

func (h *CommentHandler) Get(c *gin.Context) {
	id := c.Param("id")
	detail, err := h.svc.GetDetail(id)
	if err != nil {
		Error(c, CodeNotFound, "comment not found")
		return
	}
	Success(c, detail)
}

func (h *CommentHandler) StatusCounts(c *gin.Context) {
	counts, err := h.svc.StatusCounts()
	if err != nil {
		Error(c, CodeInternalError, err.Error())
		return
	}
	Success(c, counts)
}

func (h *CommentHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.svc.Delete(id); err != nil {
		Error(c, CodeInternalError, err.Error())
		return
	}
	Success(c, nil)
}
