package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/grapestree/fgrapery/forge/internal/service"
	"go.uber.org/zap"
)

type DashboardHandler struct {
	dashSvc *service.DashboardService
	logger  *zap.Logger
}

func NewDashboardHandler(dashSvc *service.DashboardService, logger *zap.Logger) *DashboardHandler {
	return &DashboardHandler{dashSvc: dashSvc, logger: logger}
}

func (h *DashboardHandler) GetOverview(c *gin.Context) {
	stats, err := h.dashSvc.GetOverview()
	if err != nil {
		Error(c, CodeInternalError, "failed to load overview stats")
		return
	}
	Success(c, stats)
}
