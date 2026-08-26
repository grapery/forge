package service

import (
	"fmt"

	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/repository/mysql"
)

type ContentService struct {
	readRepo  *mysql.ReadRepository
	writeRepo *mysql.WriteRepository
}

func NewContentService(readRepo *mysql.ReadRepository, writeRepo *mysql.WriteRepository) *ContentService {
	return &ContentService{readRepo: readRepo, writeRepo: writeRepo}
}

func (s *ContentService) ListContent(query *domain.ContentListQuery) ([]*domain.ContentItem, int64, error) {
	if query.Page <= 0 {
		query.Page = 1
	}
	if query.PageSize <= 0 || query.PageSize > 100 {
		query.PageSize = 20
	}
	return s.readRepo.ListContent(query)
}

func (s *ContentService) GetContentDetail(contentType, id string) (map[string]any, error) {
	return s.readRepo.GetContentDetail(contentType, id)
}

func (s *ContentService) StatusCounts(contentType string) (*domain.ContentStatusCount, error) {
	return s.readRepo.CountContentByStatus(contentType)
}

func (s *ContentService) Action(contentType, id string, req *domain.ContentActionRequest) error {
	switch req.Action {
	case "unpublish":
		return s.unpublish(contentType, id)
	case "force_delete":
		return s.forceDelete(contentType, id)
	case "restore":
		return s.restore(contentType, id)
	case "publish":
		return s.publish(contentType, id)
	default:
		return fmt.Errorf("unsupported action: %s", req.Action)
	}
}

func (s *ContentService) restore(contentType, id string) error {
	switch contentType {
	case "story":
		return s.writeRepo.RestoreStory(id)
	case "storyboard":
		return s.writeRepo.RestoreStoryboard(id)
	case "fragment":
		return s.writeRepo.RestoreFragment(id)
	default:
		return fmt.Errorf("unsupported content type: %s", contentType)
	}
}

func (s *ContentService) publish(contentType, id string) error {
	switch contentType {
	case "story":
		return s.writeRepo.PublishStory(id)
	case "storyboard":
		return s.writeRepo.PublishStoryboard(id)
	case "fragment":
		return s.writeRepo.PublishFragment(id)
	default:
		return fmt.Errorf("unsupported content type: %s", contentType)
	}
}

func (s *ContentService) unpublish(contentType, id string) error {
	switch contentType {
	case "story":
		return s.writeRepo.UnpublishStory(id)
	case "storyboard":
		return s.writeRepo.UnpublishStoryboard(id)
	case "fragment":
		return s.writeRepo.UnpublishFragment(id)
	default:
		return fmt.Errorf("unsupported content type: %s", contentType)
	}
}

func (s *ContentService) forceDelete(contentType, id string) error {
	switch contentType {
	case "story":
		return s.writeRepo.SoftDeleteStory(id)
	case "storyboard":
		return s.writeRepo.SoftDeleteStoryboard(id)
	case "fragment":
		return s.writeRepo.SoftDeleteFragment(id)
	default:
		return fmt.Errorf("unsupported content type: %s", contentType)
	}
}
