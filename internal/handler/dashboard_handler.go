package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/grapestree/fgrapery/forge/internal/service"
	"go.uber.org/zap"
)

type DashboardHandler struct {
	dashSvc    *service.DashboardService
	collector  *service.StatsCollector
	logger     *zap.Logger
}

func NewDashboardHandler(dashSvc *service.DashboardService, collector *service.StatsCollector, logger *zap.Logger) *DashboardHandler {
	return &DashboardHandler{dashSvc: dashSvc, collector: collector, logger: logger}
}

func (h *DashboardHandler) GetOverview(c *gin.Context) {
	stats, err := h.dashSvc.GetOverview()
	if err != nil {
		Error(c, CodeInternalError, "failed to load overview stats")
		return
	}
	Success(c, stats)
}

func (h *DashboardHandler) CollectStats(c *gin.Context) {
	date := c.Query("date")
	if err := h.collector.Collect(date); err != nil {
		Error(c, CodeInternalError, "failed to collect stats")
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "stats collected"})
}
