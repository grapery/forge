package domain

type ContentReport struct {
	ID          string `json:"id"`
	ReporterID  string `json:"reporterId"`
	ContentType string `json:"contentType"`
	ContentID   string `json:"contentId"`
	Reason      string `json:"reason"`
	Status      string `json:"status"`
	IsOverdue   bool   `json:"isOverdue"`
	// Joined
	ReporterName  string `json:"reporterName,omitempty"`
	CreatorID     string `json:"creatorId,omitempty"`
	CreatorName   string `json:"creatorName,omitempty"`
	ContentTitle  string `json:"contentTitle,omitempty"`
	ContentPreview string `json:"contentPreview,omitempty"`
	ContentStatus string `json:"contentStatus,omitempty"`
	ContentDeleted bool  `json:"contentDeleted,omitempty"`
	ReviewRemarks string `json:"reviewRemarks,omitempty"`
	ReviewedBy    string `json:"reviewedBy,omitempty"`
	ReviewedAt    *int64 `json:"reviewedAt,omitempty"`
	CreatedAt     int64  `json:"createdAt"`
	UpdatedAt     int64  `json:"updatedAt,omitempty"`
	// ReporterNotified is true when a moderation outcome in-app notification was written for the reporter (resolved/dismissed).
	ReporterNotified bool `json:"reporterNotified,omitempty"`
}

type ContentReportListQuery struct {
	Page        int    `form:"page"`
	PageSize    int    `form:"pageSize"`
	Status      string `form:"status,omitempty"`
	ContentType string `form:"contentType,omitempty"`
	Overdue     bool   `form:"overdue,omitempty"`
	Keyword     string `form:"keyword,omitempty"`
	ReporterID  string `form:"reporterId,omitempty"`
}

type ResolveContentReportRequest struct {
	Status  string   `json:"status" binding:"required"`
	Remarks string   `json:"remarks,omitempty"`
	Actions []string `json:"actions,omitempty"` // takedown, suspend_creator
}
