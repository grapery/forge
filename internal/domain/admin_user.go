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
	Permissions  []string  `json:"permissions"`
	LastLoginAt  *int64    `json:"lastLoginAt,omitempty"`
	LastLoginIP  string    `json:"lastAdminIp,omitempty"`
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

func IsAdminRole(role AdminRole) bool {
	return role == RoleSuperAdmin || role == RoleAdmin
}

// Permission keys
const (
	PermContent = "content"
	// PermContentModerate is a write capability. PermContent remains the legacy
	// read permission and is accepted for existing operators during rollout.
	PermContentModerate = "content-moderate"
	PermCharacters      = "characters"
	PermComments        = "comments"
	PermTags            = "tags"
	PermGenres          = "genres"
	PermAITasks         = "ai-tasks"
	PermAIGenerations   = "ai-generations"
	PermAgents          = "agents"
	PermPrompts         = "prompts"
	PermPromptEdit      = "prompt-edit"
	PermPromptReview    = "prompt-review"
	PermPromptPublish   = "prompt-publish"
	PermStyles          = "styles"
	PermUsers           = "users"
	PermMemberships     = "memberships"
	PermOrders          = "orders"
	PermTokens          = "tokens"
	PermInvitationCodes = "invitation-codes"
	PermFeedback        = "feedback"
	PermReports         = "reports"
	PermTopics          = "topics"
	PermNotifications   = "notifications"
	PermSearch          = "search"
	PermAuditLog        = "audit-log"
	PermPrivacyReview   = "privacy-review"
	PermWorkflowView    = "workflow-view"
	PermWorkflowEdit    = "workflow-edit"
	PermWorkflowReview  = "workflow-review"
	PermWorkflowPublish = "workflow-publish"
)

var AllPermissions = []string{
	PermContent, PermContentModerate, PermCharacters, PermComments, PermTags, PermGenres,
	PermAITasks, PermAIGenerations, PermAgents, PermPrompts, PermPromptEdit, PermPromptReview, PermPromptPublish, PermStyles,
	PermUsers, PermMemberships, PermOrders, PermTokens, PermInvitationCodes,
	PermFeedback, PermReports, PermTopics, PermNotifications, PermSearch,
	PermAuditLog, PermPrivacyReview,
	PermWorkflowView, PermWorkflowEdit, PermWorkflowReview, PermWorkflowPublish,
}

// PermissionGrants centralizes permission implication during the gradual
// content-moderation rollout. Existing `content` grants retain their former
// write capability; newly assigned `content-moderate` also includes read access.
func PermissionGrants(granted, required string) bool {
	if granted == required {
		return true
	}
	return (granted == PermContent && required == PermContentModerate) ||
		(granted == PermContentModerate && required == PermContent)
}

func IsValidPermission(p string) bool {
	for _, perm := range AllPermissions {
		if perm == p {
			return true
		}
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

type UpdatePermissionsRequest struct {
	Permissions []string `json:"permissions" binding:"required"`
}
