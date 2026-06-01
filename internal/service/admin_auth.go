package service

import (
	"errors"
	"fmt"
	"time"

	"github.com/grapestree/fgrapery/forge/internal/auth"
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/repository/mysql"
	"go.uber.org/zap"
)

type AdminAuthService struct {
	repo            *mysql.Repository
	logger          *zap.Logger
	accessExpire    time.Duration
	refreshExpire   time.Duration
}

func NewAdminAuthService(repo *mysql.Repository, logger *zap.Logger, accessExpire, refreshExpire time.Duration) *AdminAuthService {
	return &AdminAuthService{
		repo:          repo,
		logger:        logger,
		accessExpire:  accessExpire,
		refreshExpire: refreshExpire,
	}
}

func (s *AdminAuthService) Login(req *domain.LoginRequest, ip string) (*domain.LoginResponse, error) {
	admin, err := s.repo.GetAdminByUsername(req.Username)
	if err != nil {
		s.logger.Warn("login failed: user not found", zap.String("username", req.Username))
		return nil, errors.New("invalid username or password")
	}

	if admin.Status != "active" {
		return nil, errors.New("account is disabled")
	}

	if !auth.CheckPassword(req.Password, admin.PasswordHash) {
		s.logger.Warn("login failed: wrong password", zap.String("username", req.Username))
		return nil, errors.New("invalid username or password")
	}

	now := NowFunc()
	admin.LastLoginAt = &now
	admin.LastLoginIP = ip
	_ = s.repo.UpdateAdminLastLogin(admin.ID, now, ip)

	accessToken, err := auth.GenerateAccessToken(admin.ID, admin.Username, string(admin.Role), admin.Permissions, s.accessExpire)
	if err != nil {
		return nil, fmt.Errorf("generate access token: %w", err)
	}

	refreshToken, err := auth.GenerateRefreshToken(admin.ID, s.refreshExpire)
	if err != nil {
		return nil, fmt.Errorf("generate refresh token: %w", err)
	}

	return &domain.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(s.accessExpire.Seconds()),
		User:         *admin,
	}, nil
}

func (s *AdminAuthService) RefreshToken(refreshToken string) (*domain.LoginResponse, error) {
	claims, err := auth.ParseToken(refreshToken)
	if err != nil {
		return nil, err
	}
	if claims.Issuer != "forge-admin-refresh" {
		return nil, errors.New("invalid refresh token")
	}

	admin, err := s.repo.GetAdminByID(claims.AdminID)
	if err != nil {
		return nil, errors.New("admin not found")
	}

	if admin.Status != "active" {
		return nil, errors.New("account is disabled")
	}

	accessToken, err := auth.GenerateAccessToken(admin.ID, admin.Username, string(admin.Role), admin.Permissions, s.accessExpire)
	if err != nil {
		return nil, err
	}

	newRefresh, err := auth.GenerateRefreshToken(admin.ID, s.refreshExpire)
	if err != nil {
		return nil, err
	}

	return &domain.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: newRefresh,
		ExpiresIn:    int64(s.accessExpire.Seconds()),
		User:         *admin,
	}, nil
}

func (s *AdminAuthService) GetProfile(adminID string) (*domain.AdminUser, error) {
	return s.repo.GetAdminByID(adminID)
}

func (s *AdminAuthService) ChangePassword(adminID, oldPassword, newPassword string) error {
	admin, err := s.repo.GetAdminByID(adminID)
	if err != nil {
		return err
	}
	if !auth.CheckPassword(oldPassword, admin.PasswordHash) {
		return errors.New("current password is incorrect")
	}
	hash, err := auth.HashPassword(newPassword)
	if err != nil {
		return err
	}
	admin.PasswordHash = hash
	return s.repo.UpdateAdminPassword(admin.ID, hash)
}

func (s *AdminAuthService) SeedDefaultAdmin() {
	hash, err := auth.HashPassword("admin123456")
	if err != nil {
		s.logger.Error("failed to hash default admin password", zap.Error(err))
		return
	}
	now := NowFunc()
	admin := &domain.AdminUser{
		ID:           newUUID(),
		Username:     "admin",
		Email:        "admin@grapestree.com",
		DisplayName:  "Super Admin",
		Role:         domain.RoleSuperAdmin,
		Status:       "active",
		PasswordHash: hash,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	if err := s.repo.SeedSuperAdmin(admin); err != nil {
		s.logger.Error("failed to seed default admin", zap.Error(err))
	} else {
		s.logger.Info("default super_admin seeded (username: admin, password: admin123456)")
	}
}
