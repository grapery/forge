package domain

type SearchHistoryItem struct {
	ID          string `json:"id"`
	UserID      string `json:"userId"`
	UserName    string `json:"userName"`
	Query       string `json:"query"`
	Type        string `json:"type"`
	ResultCount int    `json:"resultCount"`
	CreatedAt   int64  `json:"createdAt"`
}

type SearchHistoryQuery struct {
	Page     int    `form:"page"`
	PageSize int    `form:"pageSize"`
	Type     string `form:"type,omitempty"`
	UserID   string `form:"userId,omitempty"`
}

type SearchTrend struct {
	Query string `json:"query"`
	Count int64  `json:"count"`
}
