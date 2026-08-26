package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/service"
	"go.uber.org/zap"
)

type SafetyReviewHandler struct {
	svc    *service.SafetyReviewService
	logger *zap.Logger
}

func NewSafetyReviewHandler(s *service.SafetyReviewService, l *zap.Logger) *SafetyReviewHandler {
	return &SafetyReviewHandler{svc: s, logger: l}
}
func (h *SafetyReviewHandler) Assets(c *gin.Context) {
	p, ps := parsePagination(c)
	items, total, err := h.svc.Assets(&domain.SafetyAssetQuery{Page: p, PageSize: ps, UserID: c.Query("userId"), Type: c.Query("type")})
	if err != nil {
		Error(c, CodeInternalError, "failed to list assets")
		return
	}
	Paginated(c, items, total, p, ps)
}
func (h *SafetyReviewHandler) Conversations(c *gin.Context) {
	p, ps := parsePagination(c)
	items, total, err := h.svc.Conversations(&domain.SafetyConversationQuery{Page: p, PageSize: ps, UserID: c.Query("userId"), SessionType: c.Query("sessionType")})
	if err != nil {
		Error(c, CodeInternalError, "failed to list conversations")
		return
	}
	Paginated(c, items, total, p, ps)
}
