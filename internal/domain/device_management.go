package domain

type UserDeviceItem struct {
	ID           string `json:"id"`
	UserID       string `json:"userId"`
	UserName     string `json:"userName"`
	DeviceToken  string `json:"deviceToken"`
	Platform     string `json:"platform"`
	PushProvider string `json:"pushProvider"`
	DeviceModel  string `json:"deviceModel"`
	OSVersion    string `json:"osVersion"`
	AppVersion   string `json:"appVersion"`
	IsActive     bool   `json:"isActive"`
	LastActiveAt int64  `json:"lastActiveAt"`
	CreatedAt    int64  `json:"createdAt"`
}

type DeviceListQuery struct {
	Page     int    `form:"page"`
	PageSize int    `form:"pageSize"`
	UserID   string `form:"userId,omitempty"`
	Platform string `form:"platform,omitempty"`
	IsActive *bool  `form:"isActive,omitempty"`
}

type DevicePlatformCount struct {
	IOS     int64 `json:"ios"`
	Android int64 `json:"android"`
	Other   int64 `json:"other"`
}

type NotificationItem struct {
	ID        string `json:"id"`
	UserID    string `json:"userId"`
	Type      string `json:"type"`
	Title     string `json:"title"`
	Content   string `json:"content"`
	Read      bool   `json:"read"`
	CreatedAt int64  `json:"createdAt"`
}

type NotificationListQuery struct {
	Page     int    `form:"page"`
	PageSize int    `form:"pageSize"`
	UserID   string `form:"userId,omitempty"`
	Type     string `form:"type,omitempty"`
}

type BroadcastNotificationRequest struct {
	Title   string `json:"title" binding:"required"`
	Content string `json:"content" binding:"required"`
	Platform string `json:"platform"`
}
