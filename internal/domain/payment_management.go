package domain

type MembershipItem struct {
	ID          string `json:"id"`
	UserID      string `json:"userId"`
	UserName    string `json:"userName"`
	Tier        string `json:"tier"`
	Status      string `json:"status"`
	StartDate   int64  `json:"startDate"`
	EndDate     int64  `json:"endDate"`
	AutoRenew   bool   `json:"autoRenew"`
	TokenQuota  int    `json:"tokenQuota"`
	TokenUsed   int    `json:"tokenUsed"`
	CreatedAt   int64  `json:"createdAt"`
	UpdatedAt   int64  `json:"updatedAt"`
}

type MembershipSummary struct {
	FreeCount   int64 `json:"freeCount"`
	BasicCount  int64 `json:"basicCount"`
	ProCount    int64 `json:"proCount"`
	PremiumCount int64 `json:"premiumCount"`
	TotalActive int64 `json:"totalActive"`
}

type SubscriptionPlanItem struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	MembershipTier string `json:"membershipTier"`
	BillingPeriod  string `json:"billingPeriod"`
	Price          float64 `json:"price"`
	Currency       string `json:"currency"`
	TokenQuota     int    `json:"tokenQuota"`
	MaxStories     int    `json:"maxStories"`
	MaxCharacters  int    `json:"maxCharacters"`
	Features       string `json:"features"`
	IsActive       bool   `json:"isActive"`
	SortOrder      int    `json:"sortOrder"`
	CreatedAt      int64  `json:"createdAt"`
	UpdatedAt      int64  `json:"updatedAt"`
}

type SubscriptionOrderItem struct {
	ID            string  `json:"id"`
	UserID        string  `json:"userId"`
	UserName      string  `json:"userName"`
	PlanID        string  `json:"planId"`
	PlanName      string  `json:"planName"`
	Amount        float64 `json:"amount"`
	Currency      string  `json:"currency"`
	Status        string  `json:"status"`
	PaymentMethod string  `json:"paymentMethod"`
	PaymentID     string  `json:"paymentId"`
	StartDate     int64   `json:"startDate"`
	EndDate       int64   `json:"endDate"`
	CreatedAt     int64   `json:"createdAt"`
	UpdatedAt     int64   `json:"updatedAt"`
}

type OrderSummary struct {
	TotalOrders   int64   `json:"totalOrders"`
	TotalRevenue  float64 `json:"totalRevenue"`
	PendingCount  int64   `json:"pendingCount"`
	CompletedCount int64  `json:"completedCount"`
	RefundedCount int64   `json:"refundedCount"`
}

type PaymentListQuery struct {
	Page     int    `form:"page"`
	PageSize int    `form:"pageSize"`
	Status   string `form:"status,omitempty"`
	Tier     string `form:"tier,omitempty"`
	UserID   string `form:"userId,omitempty"`
	DateFrom string `form:"dateFrom,omitempty"`
	DateTo   string `form:"dateTo,omitempty"`
}

type PlanCreateRequest struct {
	Name           string  `json:"name" binding:"required"`
	MembershipTier string  `json:"membershipTier" binding:"required"`
	BillingPeriod  string  `json:"billingPeriod" binding:"required"`
	Price          float64 `json:"price" binding:"required"`
	Currency       string  `json:"currency"`
	TokenQuota     int     `json:"tokenQuota"`
	MaxStories     int     `json:"maxStories"`
	MaxCharacters  int     `json:"maxCharacters"`
	Features       string  `json:"features"`
	IsActive       *bool   `json:"isActive"`
	SortOrder      int     `json:"sortOrder"`
}

type PlanUpdateRequest struct {
	Name           string  `json:"name" binding:"required"`
	MembershipTier string  `json:"membershipTier" binding:"required"`
	BillingPeriod  string  `json:"billingPeriod" binding:"required"`
	Price          float64 `json:"price" binding:"required"`
	Currency       string  `json:"currency"`
	TokenQuota     int     `json:"tokenQuota"`
	MaxStories     int     `json:"maxStories"`
	MaxCharacters  int     `json:"maxCharacters"`
	Features       string  `json:"features"`
	IsActive       *bool   `json:"isActive"`
	SortOrder      int     `json:"sortOrder"`
}

type RefundRequest struct {
	Reason string `json:"reason" binding:"required"`
}
