package service

import (
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/repository/mysql"
)

type UserService struct {
	readRepo  *mysql.ReadRepository
	writeRepo *mysql.WriteRepository
}

func NewUserService(readRepo *mysql.ReadRepository, writeRepo *mysql.WriteRepository) *UserService {
	return &UserService{readRepo: readRepo, writeRepo: writeRepo}
}

func (s *UserService) ListUsers(query *domain.UserListQuery) ([]*domain.PlatformUser, int64, error) {
	if query.Page <= 0 {
		query.Page = 1
	}
	if query.PageSize <= 0 || query.PageSize > 100 {
		query.PageSize = 20
	}
	return s.readRepo.ListUsers(query)
}

func (s *UserService) GetUser(userID string) (*domain.PlatformUser, error) {
	return s.readRepo.GetUserDetail(userID)
}

func (s *UserService) StatusCounts() (*domain.UserStatusCount, error) {
	return s.readRepo.CountUsersByStatus()
}

func (s *UserService) SuspendUser(userID string) error {
	return s.writeRepo.SuspendUser(userID)
}

func (s *UserService) ActivateUser(userID string) error {
	return s.writeRepo.ActivateUser(userID)
}
