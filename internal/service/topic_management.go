package service

import (
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/repository/mysql"
)

type TopicService struct {
	readRepo *mysql.ReadRepository
}

func NewTopicService(readRepo *mysql.ReadRepository) *TopicService {
	return &TopicService{readRepo: readRepo}
}

func (s *TopicService) ListTopics(query *domain.TopicListQuery) ([]*domain.TopicStats, int64, error) {
	if query.Page <= 0 {
		query.Page = 1
	}
	if query.PageSize <= 0 || query.PageSize > 100 {
		query.PageSize = 20
	}
	return s.readRepo.ListTopics(query)
}

func (s *TopicService) ListFragments(topic string, page, pageSize int) ([]map[string]any, int64, error) {
	return s.readRepo.ListFragmentsByTopic(topic, page, pageSize)
}

func (s *TopicService) ListStories(topic string, page, pageSize int) ([]map[string]any, int64, error) {
	return s.readRepo.ListStoriesByTopic(topic, page, pageSize)
}
