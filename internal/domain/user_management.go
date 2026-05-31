package domain

type PlatformUser struct {
	ID                string  `json:"id"`
	Username          string  `json:"username"`
	Email             string  `json:"email"`
	DisplayName       string  `json:"displayName"`
	Avatar            string  `json:"avatar"`
	Background        string  `json:"background"`
	Bio               string  `json:"bio"`
	Location          string  `json:"location"`
	Website           string  `json:"website"`
	Phone             string  `json:"phone"`
	Status            string  `json:"status"`
	EmailVerified     bool    `json:"emailVerified"`
	Followers         int     `json:"followers"`
	Following         int     `json:"following"`
	StoryboardCount   int     `json:"storyboardCount"`
	FragmentsCount    int     `json:"fragmentsCount"`
	Points            int     `json:"points"`
	ReferralCode      string  `json:"referralCode"`
	LastLoginAt       *int64  `json:"lastLoginAt"`
	CreatedAt         int64   `json:"createdAt"`
	UpdatedAt         int64   `json:"updatedAt"`
}

type UserListQuery struct {
	Page     int    `form:"page"`
	PageSize int    `form:"pageSize"`
	Search   string `form:"search,omitempty"`
	Status   string `form:"status,omitempty"`
}

type UserStatusCount struct {
	Active    int64 `json:"active"`
	Suspended int64 `json:"suspended"`
	Deleted   int64 `json:"deleted"`
}
