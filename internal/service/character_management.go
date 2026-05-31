package service

import (
	"fmt"

	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/repository/mysql"
)

type CharacterService struct {
	readRepo  *mysql.ReadRepository
	writeRepo *mysql.WriteRepository
}

func NewCharacterService(readRepo *mysql.ReadRepository, writeRepo *mysql.WriteRepository) *CharacterService {
	return &CharacterService{readRepo: readRepo, writeRepo: writeRepo}
}

func (s *CharacterService) List(query *domain.CharacterListQuery) ([]*domain.CharacterItem, int64, error) {
	if query.Page < 1 {
		query.Page = 1
	}
	if query.PageSize < 1 || query.PageSize > 100 {
		query.PageSize = 20
	}
	return s.readRepo.ListCharacters(query)
}

func (s *CharacterService) GetDetail(id string) (map[string]any, error) {
	return s.readRepo.GetCharacterDetail(id)
}

func (s *CharacterService) StatusCounts() (*domain.CharacterStatusCount, error) {
	return s.readRepo.CountCharactersByStatus()
}

func (s *CharacterService) Action(id string, req *domain.CharacterActionRequest) error {
	switch req.Action {
	case "unpublish":
		return s.writeRepo.UnpublishCharacter(id)
	case "force_delete":
		return s.writeRepo.SoftDeleteCharacter(id)
	default:
		return fmt.Errorf("unsupported action: %s", req.Action)
	}
}
