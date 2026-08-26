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
	// Storyboard-only lineage fields. A continuation remains in StoryID and
	// points to its source node through ParentID; it is never a new Story.
	StoryID            string `json:"storyId,omitempty"`
	ParentID           string `json:"parentId,omitempty"`
	ParentTitle        string `json:"parentTitle,omitempty"`
	IsContinuation     bool   `json:"isContinuation,omitempty"`
	IsRemoved          bool   `json:"isRemoved,omitempty"`
	ReportCount        int64  `json:"reportCount,omitempty"`
	PendingReportCount int64  `json:"pendingReportCount,omitempty"`
}

type ContentListQuery struct {
	Page        int    `form:"page"`
	PageSize    int    `form:"pageSize"`
	ContentType string `form:"contentType"`
	Search      string `form:"search,omitempty"`
	Status      string `form:"status,omitempty"`
	AuthorID    string `form:"authorId,omitempty"`
	// storyboard only: all | root | continuation
	Lineage string `form:"lineage,omitempty"`
	// all | active | removed. Removed records are visible only to Forge admins
	// so a mistaken moderation takedown can be restored.
	Lifecycle string `form:"lifecycle,omitempty"`
	// all | reported | pending_reports | unreported
	ReportState string `form:"reportState,omitempty"`
}

type ContentActionRequest struct {
	Action string `json:"action" binding:"required"`
	Reason string `json:"reason,omitempty"`
}

type ContentStatusCount struct {
	Total          int64 `json:"total"`
	Published      int64 `json:"published"`
	Draft          int64 `json:"draft"`
	Other          int64 `json:"other"`
	Root           int64 `json:"root,omitempty"`
	Continuation   int64 `json:"continuation,omitempty"`
	Removed        int64 `json:"removed,omitempty"`
	Reported       int64 `json:"reported,omitempty"`
	PendingReports int64 `json:"pendingReports,omitempty"`
}
