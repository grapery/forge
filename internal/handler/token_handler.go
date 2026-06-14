package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/service"
	"go.uber.org/zap"
)

type TokenHandler struct {
	svc    *service.TokenService
	logger *zap.Logger
}

func NewTokenHandler(svc *service.TokenService, logger *zap.Logger) *TokenHandler {
	return &TokenHandler{svc: svc, logger: logger}
}

func (h *TokenHandler) List(c *gin.Context) {
	page, pageSize := parsePagination(c)
	dateTo := c.Query("dateTo")
	if dateTo != "" && len(dateTo) == 10 {
		dateTo = dateTo + " 23:59:59"
	}
	query := &domain.TokenListQuery{
		Page:     page,
		PageSize: pageSize,
		UserID:   c.Query("userId"),
		Type:     c.Query("type"),
		DateFrom: c.Query("dateFrom"),
		DateTo:   dateTo,
		Keyword:  c.Query("keyword"),
	}

	items, total, err := h.svc.List(query)
	if err != nil {
		Error(c, CodeInternalError, err.Error())
		return
	}
	Paginated(c, items, total, page, pageSize)
}

func (h *TokenHandler) Summary(c *gin.Context) {
	summary, err := h.svc.Summary()
	if err != nil {
		Error(c, CodeInternalError, err.Error())
		return
	}
	Success(c, summary)
}
