package domain

type PromptAuditRecord struct {
	ID                    string  `json:"id"`
	RunID                 string  `json:"runId"`
	RelatedEntityType     string  `json:"relatedEntityType"`
	RelatedEntityID       string  `json:"relatedEntityId"`
	Step                  string  `json:"step"`
	PromptKind            string  `json:"promptKind"`
	PromptTemplateVersion string  `json:"promptTemplateVersion"`
	Provider              string  `json:"provider"`
	Model                 string  `json:"model"`
	Temperature           float64 `json:"temperature"`
	MaxTokens             int     `json:"maxTokens"`
	SystemPrompt          string  `json:"systemPrompt"`
	UserPrompt            string  `json:"userPrompt"`
	FinalPrompt           string  `json:"finalPrompt"`
	Output                string  `json:"output"`
	InputTokens           int     `json:"inputTokens"`
	OutputTokens          int     `json:"outputTokens"`
	AlignmentSnapshotHash string  `json:"alignmentSnapshotHash"`
	FullPromptHash        string  `json:"fullPromptHash"`
	ReferenceImageUrls    string  `json:"referenceImageUrls"`
	TokenUsageJson        string  `json:"tokenUsageJson"`
	MetadataJson          string  `json:"metadataJson"`
	CreatedAt             int64   `json:"createdAt"`
}

type PromptAuditQuery struct {
	Page              int    `form:"page"`
	PageSize          int    `form:"pageSize"`
	Provider          string `form:"provider,omitempty"`
	Model             string `form:"model,omitempty"`
	PromptKind        string `form:"promptKind,omitempty"`
	RelatedEntityType string `form:"relatedEntityType,omitempty"`
}

type PromptAuditSummary struct {
	TotalRecords int64         `json:"totalRecords"`
	TotalTokens  int64         `json:"totalTokens"`
	TopProviders []ProviderStat `json:"topProviders"`
}

type ProviderStat struct {
	Provider string `json:"provider"`
	Count    int64  `json:"count"`
}
