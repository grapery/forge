package domain

type Report struct {
	ID         string `json:"id"`
	ReporterID string `json:"reporterId"`
	ReportedID string `json:"reportedId"`
	Reason     string `json:"reason"`
	Status     string `json:"status"`
	IsOverdue  bool   `json:"isOverdue"`
	// Joined from users table
	ReporterName  string `json:"reporterName,omitempty"`
	ReportedName  string `json:"reportedName,omitempty"`
	ReviewRemarks string `json:"reviewRemarks,omitempty"`
	ReviewedBy    string `json:"reviewedBy,omitempty"`
	ReviewedAt    *int64 `json:"reviewedAt,omitempty"`
	CreatedAt     int64  `json:"createdAt"`
	UpdatedAt     int64  `json:"updatedAt,omitempty"`
}

type ReportStatusCounts struct {
	Pending   int64 `json:"pending"`
	Reviewed  int64 `json:"reviewed"`
	Resolved  int64 `json:"resolved"`
	Dismissed int64 `json:"dismissed"`
	Overdue   int64 `json:"overdue"`
}

type ReportListQuery struct {
	Page     int    `form:"page"`
	PageSize int    `form:"pageSize"`
	Status   string `form:"status,omitempty"`
}

type ReviewReportRequest struct {
	Status  string `json:"status" binding:"required"`
	Remarks string `json:"remarks,omitempty"`
}
