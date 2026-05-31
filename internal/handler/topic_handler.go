package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/service"
	"go.uber.org/zap"
)

type TopicHandler struct {
	topicSvc *service.TopicService
	logger   *zap.Logger
}

func NewTopicHandler(topicSvc *service.TopicService, logger *zap.Logger) *TopicHandler {
	return &TopicHandler{topicSvc: topicSvc, logger: logger}
}

func (h *TopicHandler) List(c *gin.Context) {
	page, pageSize := parsePagination(c)
	query := &domain.TopicListQuery{
		Page:     page,
		PageSize: pageSize,
		Search:   c.Query("search"),
	}
	topics, total, err := h.topicSvc.ListTopics(query)
	if err != nil {
		h.logger.Error("failed to list topics", zap.Error(err))
		Error(c, CodeInternalError, "failed to list topics")
		return
	}
	Paginated(c, topics, total, page, pageSize)
}

func (h *TopicHandler) ListFragments(c *gin.Context) {
	topic := c.Param("topic")
	page, pageSize := parsePagination(c)
	items, total, err := h.topicSvc.ListFragments(topic, page, pageSize)
	if err != nil {
		h.logger.Error("failed to list fragments by topic", zap.Error(err))
		Error(c, CodeInternalError, "failed to list fragments")
		return
	}
	Paginated(c, items, total, page, pageSize)
}

func (h *TopicHandler) ListStories(c *gin.Context) {
	topic := c.Param("topic")
	page, pageSize := parsePagination(c)
	items, total, err := h.topicSvc.ListStories(topic, page, pageSize)
	if err != nil {
		h.logger.Error("failed to list stories by topic", zap.Error(err))
		Error(c, CodeInternalError, "failed to list stories")
		return
	}
	Paginated(c, items, total, page, pageSize)
}
