package domain

type InvitationCodeItem struct {
	ID            string `json:"id"`
	Code          string `json:"code"`
	CreatedBy     string `json:"createdBy"`
	CreatedByName string `json:"createdByName"`
	UsedBy        string `json:"usedBy"`
	UsedByName    string `json:"usedByName"`
	UsedAt        int64  `json:"usedAt"`
	IsActive      bool   `json:"isActive"`
	MaxUses       int    `json:"maxUses"`
	CurrentUses   int    `json:"currentUses"`
	ExpiresAt     int64  `json:"expiresAt"`
	Description   string `json:"description"`
	CreatedAt     int64  `json:"createdAt"`
}

type InvitationCodeListQuery struct {
	Page      int    `form:"page"`
	PageSize  int    `form:"pageSize"`
	IsActive  *bool  `form:"isActive,omitempty"`
	CreatedBy string `form:"createdBy,omitempty"`
}

type InvitationCodeCreateRequest struct {
	MaxUses     int   `json:"maxUses"`
	ExpiresAt   int64 `json:"expiresAt"`
	Description string `json:"description"`
}

type ReferralItem struct {
	ID            string `json:"id"`
	ReferrerID    string `json:"referrerId"`
	ReferrerName  string `json:"referrerName"`
	RefereeID     string `json:"refereeId"`
	RefereeName   string `json:"refereeName"`
	ReferralCode  string `json:"referralCode"`
	PointsEarned  int    `json:"pointsEarned"`
	Status        string `json:"status"`
	CreatedAt     int64  `json:"createdAt"`
}

type ReferralListQuery struct {
	Page     int    `form:"page"`
	PageSize int    `form:"pageSize"`
}
