package domain

type AdminRole string

const (
	RoleSuperAdmin AdminRole = "super_admin"
	RoleAdmin      AdminRole = "admin"
	RoleOperator   AdminRole = "operator"
	RoleViewer     AdminRole = "viewer"
)

type AdminUser struct {
	ID           string    `json:"id"`
	Username     string    `json:"username"`
	Email        string    `json:"email"`
	DisplayName  string    `json:"displayName"`
	Role         AdminRole `json:"role"`
	Status       string    `json:"status"` // active / disabled
	PasswordHash string    `json:"-"`
	LastLoginAt  *int64    `json:"lastLoginAt,omitempty"`
	LastLoginIP  string    `json:"lastLoginIp,omitempty"`
	CreatedAt    int64     `json:"createdAt"`
	UpdatedAt    int64     `json:"updatedAt"`
}

func (r AdminRole) CanManage(target AdminRole) bool {
	roleLevel := map[AdminRole]int{
		RoleSuperAdmin: 4,
		RoleAdmin:      3,
		RoleOperator:   2,
		RoleViewer:     1,
	}
	return roleLevel[r] > roleLevel[target]
}

func (r AdminRole) IsValid() bool {
	switch r {
	case RoleSuperAdmin, RoleAdmin, RoleOperator, RoleViewer:
		return true
	}
	return false
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	AccessToken  string    `json:"accessToken"`
	RefreshToken string    `json:"refreshToken"`
	ExpiresIn    int64     `json:"expiresIn"`
	User         AdminUser `json:"user"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refreshToken" binding:"required"`
}

type ChangePasswordRequest struct {
	OldPassword string `json:"oldPassword" binding:"required,min=8"`
	NewPassword string `json:"newPassword" binding:"required,min=8"`
}

type CreateAdminUserRequest struct {
	Username    string    `json:"username" binding:"required,min=3,max=50"`
	Email       string    `json:"email" binding:"required,email"`
	Password    string    `json:"password" binding:"required,min=8"`
	DisplayName string    `json:"displayName"`
	Role        AdminRole `json:"role" binding:"required"`
}

type UpdateAdminUserRequest struct {
	DisplayName *string    `json:"displayName,omitempty"`
	Role        *AdminRole `json:"role,omitempty"`
	Status      *string    `json:"status,omitempty"`
}

type ResetAdminPasswordRequest struct {
	NewPassword string `json:"newPassword" binding:"required,min=8"`
}
