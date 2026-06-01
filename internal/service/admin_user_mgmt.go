package service

import (
	"errors"

	"github.com/grapestree/fgrapery/forge/internal/auth"
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/repository/mysql"
	"go.uber.org/zap"
)

type AdminUserMgmtService struct {
	repo   *mysql.Repository
	logger *zap.Logger
}

func NewAdminUserMgmtService(repo *mysql.Repository, logger *zap.Logger) *AdminUserMgmtService {
	return &AdminUserMgmtService{repo: repo, logger: logger}
}

func (s *AdminUserMgmtService) ListAdminUsers(page, pageSize int) ([]*domain.AdminUser, int64, error) {
	return s.repo.ListAdminUsers(page, pageSize)
}

func (s *AdminUserMgmtService) CreateAdminUser(req *domain.CreateAdminUserRequest, creatorRole domain.AdminRole) (*domain.AdminUser, error) {
	if !req.Role.IsValid() {
		return nil, errors.New("invalid role value")
	}
	if !creatorRole.CanManage(req.Role) {
		return nil, errors.New("insufficient role to create user with this role")
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	now := NowFunc()
	admin := &domain.AdminUser{
		ID:           newUUID(),
		Username:     req.Username,
		Email:        req.Email,
		DisplayName:  req.DisplayName,
		Role:         req.Role,
		Status:       "active",
		PasswordHash: hash,
		Permissions:  []string{},
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := s.repo.CreateAdminUser(admin); err != nil {
		return nil, err
	}
	return admin, nil
}

func (s *AdminUserMgmtService) UpdateAdminUser(id string, req *domain.UpdateAdminUserRequest, updaterRole domain.AdminRole, updaterID string) (*domain.AdminUser, error) {
	admin, err := s.repo.GetAdminByID(id)
	if err != nil {
		return nil, err
	}

	if !updaterRole.CanManage(admin.Role) {
		return nil, errors.New("insufficient role to update this user")
	}

	if req.DisplayName != nil {
		admin.DisplayName = *req.DisplayName
	}
	if req.Role != nil {
		if !req.Role.IsValid() {
			return nil, errors.New("invalid role value")
		}
		if !updaterRole.CanManage(*req.Role) {
			return nil, errors.New("insufficient role to assign this role")
		}
		admin.Role = *req.Role
	}
	if req.Status != nil {
		if *req.Status != "active" && *req.Status != "disabled" {
			return nil, errors.New("invalid status value")
		}
		admin.Status = *req.Status
	}

	if err := s.repo.UpdateAdminUser(admin); err != nil {
		return nil, err
	}
	return admin, nil
}

func (s *AdminUserMgmtService) ResetAdminPassword(id string, newPassword string) error {
	hash, err := auth.HashPassword(newPassword)
	if err != nil {
		return err
	}
	admin, err := s.repo.GetAdminByID(id)
	if err != nil {
		return err
	}
	admin.PasswordHash = hash
	return s.repo.UpdateAdminPassword(admin.ID, hash)
}

func (s *AdminUserMgmtService) DeleteAdminUser(id string, deleterRole domain.AdminRole, deleterID string) error {
	if id == deleterID {
		return errors.New("cannot delete yourself")
	}
	admin, err := s.repo.GetAdminByID(id)
	if err != nil {
		return err
	}
	if !deleterRole.CanManage(admin.Role) {
		return errors.New("insufficient role to delete this user")
	}
	return s.repo.DeleteAdminUser(id)
}

func (s *AdminUserMgmtService) GetPermissions(id string) ([]string, error) {
	admin, err := s.repo.GetAdminByID(id)
	if err != nil {
		return nil, err
	}
	return admin.Permissions, nil
}

func (s *AdminUserMgmtService) UpdatePermissions(id string, permissions []string, adminRole domain.AdminRole, adminID string) error {
	if id == adminID {
		return errors.New("cannot modify your own permissions")
	}
	if !domain.IsAdminRole(adminRole) {
		return errors.New("only admins can manage permissions")
	}
	admin, err := s.repo.GetAdminByID(id)
	if err != nil {
		return err
	}
	if admin.Role != domain.RoleOperator && admin.Role != domain.RoleViewer {
		return errors.New("can only set permissions for operators/viewers")
	}
	validPerms := make([]string, 0, len(permissions))
	for _, p := range permissions {
		if domain.IsValidPermission(p) {
			validPerms = append(validPerms, p)
		}
	}
	admin.Permissions = validPerms
	return s.repo.UpdateAdminUser(admin)
}
