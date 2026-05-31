package domain

type Report struct {
	ID         string `json:"id"`
	ReporterID string `json:"reporterId"`
	ReportedID string `json:"reportedId"`
	Reason     string `json:"reason"`
	Status     string `json:"status"`
	// Joined from users table
	ReporterName string `json:"reporterName,omitempty"`
	ReportedName string `json:"reportedName,omitempty"`
	CreatedAt    int64  `json:"createdAt"`
	UpdatedAt    int64  `json:"updatedAt,omitempty"`
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
