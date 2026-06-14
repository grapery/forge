package domain

type AITaskItem struct {
	ID               string `json:"id"`
	Type             string `json:"type"`
	Status           string `json:"status"`
	Provider         string `json:"provider"`
	Model            string `json:"model"`
	UserID           string `json:"userId"`
	UserName         string `json:"userName"`
	TokensUsed       int64  `json:"tokensUsed"`
	Progress         int    `json:"progress"`
	RelatedEntityID  string `json:"relatedEntityId"`
	RelatedEntityType string `json:"relatedEntityType"`
	Error            string `json:"errorMessage"`
	CreatedAt        int64  `json:"createdAt"`
	StartedAt        *int64 `json:"startedAt"`
	CompletedAt      *int64 `json:"completedAt"`
}

type AITaskListQuery struct {
	Page     int    `form:"page"`
	PageSize int    `form:"pageSize"`
	Type     string `form:"type,omitempty"`
	Status   string `form:"status,omitempty"`
	Provider string `form:"provider,omitempty"`
	Model    string `form:"model,omitempty"`
	UserID   string `form:"userId,omitempty"`
	DateFrom string `form:"dateFrom,omitempty"`
	DateTo   string `form:"dateTo,omitempty"`
}

type AITaskSummary struct {
	TotalTasks     int64         `json:"totalTasks"`
	PendingTasks   int64         `json:"pendingTasks"`
	CompletedTasks int64         `json:"completedTasks"`
	FailedTasks    int64         `json:"failedTasks"`
	TotalTokens    int64         `json:"totalTokens"`
	TopProviders   []ProviderStat `json:"topProviders"`
}

type AIGenerationRecordItem struct {
	ID                string `json:"id"`
	Type              string `json:"type"`
	Status            string `json:"status"`
	Provider          string `json:"provider"`
	Model             string `json:"model"`
	UserID            string `json:"userId"`
	UserName          string `json:"userName"`
	InputTokens       int    `json:"inputTokens"`
	OutputTokens      int    `json:"outputTokens"`
	TotalTokens       int    `json:"totalTokens"`
	ImageCount        int    `json:"imageCount"`
	VideoCount        int    `json:"videoCount"`
	DurationMs        int64  `json:"durationMs"`
	RelatedEntityID   string `json:"relatedEntityId"`
	RelatedEntityType string `json:"relatedEntityType"`
	ErrorMessage      string `json:"errorMessage"`
	CreatedAt         int64  `json:"createdAt"`
}

type AIGenerationListQuery struct {
	Page              int    `form:"page"`
	PageSize          int    `form:"pageSize"`
	Type              string `form:"type,omitempty"`
	Status            string `form:"status,omitempty"`
	Provider          string `form:"provider,omitempty"`
	Model             string `form:"model,omitempty"`
	UserID            string `form:"userId,omitempty"`
	DateFrom          string `form:"dateFrom,omitempty"`
	DateTo            string `form:"dateTo,omitempty"`
	Keyword           string `form:"keyword,omitempty"`
	RelatedEntityType string `form:"relatedEntityType,omitempty"`
}

type AIGenerationSummary struct {
	TotalRecords int64         `json:"totalRecords"`
	TotalTokens  int64         `json:"totalTokens"`
	TotalImages  int64         `json:"totalImages"`
	TotalVideos  int64         `json:"totalVideos"`
	TopProviders []ProviderStat `json:"topProviders"`
}
