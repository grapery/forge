package domain

type UserBlock struct {
	ID          string `json:"id"`
	BlockerID   string `json:"blockerId"`
	BlockedID   string `json:"blockedId"`
	BlockerName string `json:"blockerName,omitempty"`
	BlockedName string `json:"blockedName,omitempty"`
	CreatedAt   int64  `json:"createdAt"`
}

type BlockListQuery struct {
	Page      int    `form:"page"`
	PageSize  int    `form:"pageSize"`
	BlockerID string `form:"blockerId,omitempty"`
	BlockedID string `form:"blockedId,omitempty"`
	Search    string `form:"search,omitempty"`
}

type BlockCounts struct {
	Total      int64 `json:"total"`
	Last7Days  int64 `json:"last7Days"`
}
