package mysql

import (
	"encoding/json"
	"time"

	"github.com/grapestree/fgrapery/forge/internal/domain"
)

func (r *Repository) GetAdminByUsername(username string) (*domain.AdminUser, error) {
	var m AdminUser
	if err := r.db.Where("username = ? AND deleted_at IS NULL", username).First(&m).Error; err != nil {
		return nil, err
	}
	return adminUserToDomain(&m), nil
}

func (r *Repository) GetAdminByID(id string) (*domain.AdminUser, error) {
	var m AdminUser
	if err := r.db.Where("id = ? AND deleted_at IS NULL", id).First(&m).Error; err != nil {
		return nil, err
	}
	return adminUserToDomain(&m), nil
}

func (r *Repository) CreateAdminUser(u *domain.AdminUser) error {
	m := adminUserToModel(u)
	return r.db.Create(m).Error
}

func (r *Repository) UpdateAdminUser(u *domain.AdminUser) error {
	permsJSON, _ := json.Marshal(u.Permissions)
	return r.db.Model(&AdminUser{}).Where("id = ?", u.ID).Updates(map[string]interface{}{
		"display_name":  u.DisplayName,
		"role":          string(u.Role),
		"status":        u.Status,
		"password_hash": u.PasswordHash,
		"permissions":   string(permsJSON),
		"last_login_at": u.LastLoginAt,
		"last_login_ip": u.LastLoginIP,
		"updated_at":    time.Now().Unix(),
	}).Error
}

func (r *Repository) UpdateAdminLastLogin(id string, lastLoginAt int64, lastLoginIP string) error {
	return r.db.Model(&AdminUser{}).Where("id = ?", id).Updates(map[string]interface{}{
		"last_login_at": lastLoginAt,
		"last_login_ip": lastLoginIP,
		"updated_at":    time.Now().Unix(),
	}).Error
}

func (r *Repository) UpdateAdminPassword(id string, passwordHash string) error {
	return r.db.Model(&AdminUser{}).Where("id = ?", id).Updates(map[string]interface{}{
		"password_hash": passwordHash,
		"updated_at":    time.Now().Unix(),
	}).Error
}

func (r *Repository) ListAdminUsers(page, pageSize int) ([]*domain.AdminUser, int64, error) {
	var total int64
	if err := r.db.Model(&AdminUser{}).Where("deleted_at IS NULL").Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var models []AdminUser
	offset := (page - 1) * pageSize
	if err := r.db.Where("deleted_at IS NULL").Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&models).Error; err != nil {
		return nil, 0, err
	}

	result := make([]*domain.AdminUser, len(models))
	for i := range models {
		result[i] = adminUserToDomain(&models[i])
	}
	return result, total, nil
}

func (r *Repository) DeleteAdminUser(id string) error {
	now := time.Now()
	return r.db.Model(&AdminUser{}).Where("id = ?", id).Update("deleted_at", now).Error
}

func (r *Repository) SeedSuperAdmin(u *domain.AdminUser) error {
	var count int64
	r.db.Model(&AdminUser{}).Where("role = ? AND deleted_at IS NULL", "super_admin").Count(&count)
	if count > 0 {
		return nil
	}
	return r.CreateAdminUser(u)
}

func adminUserToDomain(m *AdminUser) *domain.AdminUser {
	var perms []string
	if m.Permissions != "" {
		json.Unmarshal([]byte(m.Permissions), &perms)
	}
	return &domain.AdminUser{
		ID:           m.ID,
		Username:     m.Username,
		Email:        m.Email,
		DisplayName:  m.DisplayName,
		Role:         domain.AdminRole(m.Role),
		Status:       m.Status,
		PasswordHash: m.PasswordHash,
		Permissions:  perms,
		LastLoginAt:  m.LastLoginAt,
		LastLoginIP:  m.LastLoginIP,
		CreatedAt:    m.CreatedAt,
		UpdatedAt:    m.UpdatedAt,
	}
}

func adminUserToModel(u *domain.AdminUser) *AdminUser {
	permsJSON, _ := json.Marshal(u.Permissions)
	return &AdminUser{
		ID:           u.ID,
		Username:     u.Username,
		Email:        u.Email,
		PasswordHash: u.PasswordHash,
		DisplayName:  u.DisplayName,
		Role:         string(u.Role),
		Permissions:  string(permsJSON),
		Status:       u.Status,
	}
}

// AutoMigrate creates tables if not exist.
func (r *Repository) AutoMigrate() error {
	return r.db.AutoMigrate(&AdminUser{}, &AdminOperationLog{})
}
