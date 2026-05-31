package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/service"
	"go.uber.org/zap"
)

type CharacterHandler struct {
	svc    *service.CharacterService
	logger *zap.Logger
}

func NewCharacterHandler(svc *service.CharacterService, logger *zap.Logger) *CharacterHandler {
	return &CharacterHandler{svc: svc, logger: logger}
}

func (h *CharacterHandler) List(c *gin.Context) {
	page, pageSize := parsePagination(c)
	var query domain.CharacterListQuery
	query.Page = page
	query.PageSize = pageSize
	query.Search = c.Query("search")
	query.AuthorID = c.Query("authorId")
	if v := c.Query("isPublic"); v == "true" {
		b := true
		query.IsPublic = &b
	} else if v == "false" {
		b := false
		query.IsPublic = &b
	}

	items, total, err := h.svc.List(&query)
	if err != nil {
		Error(c, CodeInternalError, err.Error())
		return
	}
	Paginated(c, items, total, page, pageSize)
}

func (h *CharacterHandler) Get(c *gin.Context) {
	id := c.Param("id")
	detail, err := h.svc.GetDetail(id)
	if err != nil {
		Error(c, CodeNotFound, "character not found")
		return
	}
	Success(c, detail)
}

func (h *CharacterHandler) StatusCounts(c *gin.Context) {
	counts, err := h.svc.StatusCounts()
	if err != nil {
		Error(c, CodeInternalError, err.Error())
		return
	}
	Success(c, counts)
}

func (h *CharacterHandler) Action(c *gin.Context) {
	id := c.Param("id")
	var req domain.CharacterActionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, CodeInvalidParams, err.Error())
		return
	}
	if err := h.svc.Action(id, &req); err != nil {
		Error(c, CodeInternalError, err.Error())
		return
	}
	Success(c, nil)
}
