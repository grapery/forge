package domain

type Feedback struct {
	ID          string `json:"id"`
	UserID      string `json:"userId"`
	Category    string `json:"category"`
	Content     string `json:"content"`
	ContactInfo string `json:"contactInfo,omitempty"`
	Status      string `json:"status"`
	Response    string `json:"response,omitempty"`
	CreatedAt   int64  `json:"createdAt"`
	UpdatedAt   int64  `json:"updatedAt,omitempty"`
}

type FeedbackListQuery struct {
	Page     int    `form:"page"`
	PageSize int    `form:"pageSize"`
	Status   string `form:"status,omitempty"`
	Category string `form:"category,omitempty"`
	UserID   string `form:"userId,omitempty"`
}

type UpdateFeedbackRequest struct {
	Status   *string `json:"status,omitempty"`
	Response *string `json:"response,omitempty"`
}

type FeedbackStatusCount struct {
	Received  int64 `json:"received"`
	Processing int64 `json:"processing"`
	Resolved  int64 `json:"resolved"`
	Closed    int64 `json:"closed"`
}
