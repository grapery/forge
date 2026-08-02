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
	days := 30
	switch c.Query("range") {
	case "7d":
		days = 7
	case "90d":
		days = 90
	case "30d", "":
		days = 30
	default:
		days = 30
	}
	stats, err := h.dashSvc.GetOverview(days)
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
