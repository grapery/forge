package domain

type ShareEventItem struct {
	ID        string `json:"id"`
	EventType string `json:"eventType"`
	Kind      string `json:"kind"`
	ContentID string `json:"contentId"`
	UserID    string `json:"userId,omitempty"`
	UserName  string `json:"userName,omitempty"`
	Platform  string `json:"platform,omitempty"`
	Source    string `json:"source,omitempty"`
	CreatedAt int64  `json:"createdAt"`
}

type ShareEventQuery struct {
	Page      int
	PageSize  int
	EventType string
	Kind      string
}

type ShareTrendPoint struct {
	Date   string `json:"date"`
	Issues int64  `json:"issues"`
	Opens  int64  `json:"opens"`
}

type ShareKindCount struct {
	Kind  string `json:"kind"`
	Count int64  `json:"count"`
}

type ShareOverview struct {
	TotalIssues   int64            `json:"totalIssues"`
	TotalOpens    int64            `json:"totalOpens"`
	IssuesToday   int64            `json:"issuesToday"`
	OpensToday    int64            `json:"opensToday"`
	OpenRate      float64          `json:"openRate"`
	ByKindIssues  []ShareKindCount `json:"byKindIssues"`
	ByKindOpens   []ShareKindCount `json:"byKindOpens"`
	Daily         []ShareTrendPoint `json:"daily"`
}
