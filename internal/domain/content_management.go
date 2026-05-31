package domain

type ContentItem struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	ContentType string `json:"contentType"`
	AuthorID    string `json:"authorId"`
	AuthorName  string `json:"authorName"`
	Status      string `json:"status"`
	Visibility  string `json:"visibility"`
	Likes       int    `json:"likes"`
	Comments    int    `json:"comments"`
	CreatedAt   int64  `json:"createdAt"`
	UpdatedAt   int64  `json:"updatedAt"`
}

type ContentListQuery struct {
	Page        int    `form:"page"`
	PageSize    int    `form:"pageSize"`
	ContentType string `form:"contentType"`
	Search      string `form:"search,omitempty"`
	Status      string `form:"status,omitempty"`
	AuthorID    string `form:"authorId,omitempty"`
}

type ContentActionRequest struct {
	Action string `json:"action" binding:"required"`
	Reason string `json:"reason,omitempty"`
}

type ContentStatusCount struct {
	Total     int64 `json:"total"`
	Published int64 `json:"published"`
	Draft     int64 `json:"draft"`
	Other     int64 `json:"other"`
}
