package domain

type AdminOperationLog struct {
	ID          string `json:"id"`
	AdminID     string `json:"adminId"`
	AdminName   string `json:"adminName"`
	Action      string `json:"action"`      // create/update/delete/status_change/login
	Resource    string `json:"resource"`     // user/story/storyboard/fragment/...
	ResourceID  string `json:"resourceId"`
	BeforeValue string `json:"beforeValue,omitempty"`
	AfterValue  string `json:"afterValue,omitempty"`
	IP          string `json:"ip"`
	UserAgent   string `json:"userAgent"`
	CreatedAt   int64  `json:"createdAt"`
}

type OperationLogQuery struct {
	Page      int    `form:"page"`
	PageSize  int    `form:"pageSize"`
	AdminID   string `form:"adminId,omitempty"`
	Action    string `form:"action,omitempty"`
	Resource  string `form:"resource,omitempty"`
	StartDate *int64 `form:"startDate,omitempty"`
	EndDate   *int64 `form:"endDate,omitempty"`
}
