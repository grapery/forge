package domain

type AccountDeletionItem struct {
	ID                  string  `json:"id"`
	UserID              string  `json:"userId"`
	UserName            string  `json:"userName"`
	Reason              string  `json:"reason"`
	Feedback            string  `json:"feedback"`
	Status              string  `json:"status"`
	RequestedAt         int64   `json:"requestedAt"`
	ScheduledDeletionAt int64   `json:"scheduledDeletionAt"`
	ProcessedAt         *int64  `json:"processedAt"`
	CancelledAt         *int64  `json:"cancelledAt"`
	CancelledReason     string  `json:"cancelledReason"`
	CreatedAt           int64   `json:"createdAt"`
}

type AccountDeletionListQuery struct {
	Page     int    `form:"page"`
	PageSize int    `form:"pageSize"`
	Status   string `form:"status,omitempty"`
	UserID   string `form:"userId,omitempty"`
}

type AccountDeletionStatusCount struct {
	Pending    int64 `json:"pending"`
	Processing int64 `json:"processing"`
	Completed  int64 `json:"completed"`
	Cancelled  int64 `json:"cancelled"`
}

type AccountDeletionActionRequest struct {
	Action string `json:"action" binding:"required"`
	Reason string `json:"reason,omitempty"`
}
