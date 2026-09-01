package domain

import "time"

const (
	WorkflowDraftStatusDraft     = "draft"
	WorkflowDraftStatusReviewing = "reviewing"
	WorkflowDraftStatusApproved  = "approved"
	WorkflowDraftStatusRejected  = "rejected"
	WorkflowDraftStatusReleased  = "released"
)

type WorkflowNode struct {
	ID        string         `json:"id"`
	Type      string         `json:"type"`
	Activity  string         `json:"activity,omitempty"`
	DependsOn []string       `json:"dependsOn,omitempty"`
	Config    map[string]any `json:"config,omitempty"`
}

type WorkflowDefinition struct {
	InputSchema  map[string]any `json:"inputSchema,omitempty"`
	OutputSchema map[string]any `json:"outputSchema,omitempty"`
	Nodes        []WorkflowNode `json:"nodes"`
}

type WorkflowPolicies struct {
	MaxDurationSeconds int `json:"maxDurationSeconds,omitempty"`
	MaxParallelism     int `json:"maxParallelism,omitempty"`
	MaxAttempts        int `json:"maxAttempts,omitempty"`
}

type WorkflowDraft struct {
	ID              string             `json:"id"`
	Key             string             `json:"key"`
	Version         int                `json:"version"`
	Revision        int                `json:"revision"`
	Name            string             `json:"name"`
	Description     string             `json:"description,omitempty"`
	Status          string             `json:"status"`
	Manifest        map[string]any     `json:"manifest,omitempty"`
	Definition      WorkflowDefinition `json:"definition"`
	PromptBundle    map[string]string  `json:"promptBundle,omitempty"`
	Policies        WorkflowPolicies   `json:"policies,omitempty"`
	CreatedBy       string             `json:"createdBy"`
	UpdatedBy       string             `json:"updatedBy"`
	ApprovedBy      []string           `json:"approvedBy,omitempty"`
	ReleaseID       string             `json:"releaseId,omitempty"`
	ReleaseChecksum string             `json:"releaseChecksum,omitempty"`
	CreatedAt       time.Time          `json:"createdAt"`
	UpdatedAt       time.Time          `json:"updatedAt"`
}

type WorkflowApproval struct {
	ID         string    `json:"id"`
	DraftID    string    `json:"draftId"`
	ReviewerID string    `json:"reviewerId"`
	Decision   string    `json:"decision"`
	Comment    string    `json:"comment,omitempty"`
	CreatedAt  time.Time `json:"createdAt"`
}

type CreateWorkflowDraftRequest struct {
	Key          string             `json:"key" binding:"required"`
	Name         string             `json:"name" binding:"required"`
	Description  string             `json:"description,omitempty"`
	Manifest     map[string]any     `json:"manifest,omitempty"`
	Definition   WorkflowDefinition `json:"definition" binding:"required"`
	PromptBundle map[string]string  `json:"promptBundle,omitempty"`
	Policies     WorkflowPolicies   `json:"policies,omitempty"`
}

type UpdateWorkflowDraftRequest struct {
	Revision     int                `json:"revision" binding:"required"`
	Name         string             `json:"name" binding:"required"`
	Description  string             `json:"description,omitempty"`
	Manifest     map[string]any     `json:"manifest,omitempty"`
	Definition   WorkflowDefinition `json:"definition" binding:"required"`
	PromptBundle map[string]string  `json:"promptBundle,omitempty"`
	Policies     WorkflowPolicies   `json:"policies,omitempty"`
}

type ReviewWorkflowRequest struct {
	Decision string `json:"decision" binding:"required,oneof=approved rejected"`
	Comment  string `json:"comment,omitempty"`
}

type WorkflowRelease struct {
	ID           string             `json:"id"`
	Key          string             `json:"key"`
	Version      int                `json:"version"`
	Name         string             `json:"name"`
	Description  string             `json:"description,omitempty"`
	Status       string             `json:"status"`
	Manifest     map[string]any     `json:"manifest,omitempty"`
	Definition   WorkflowDefinition `json:"definition"`
	PromptBundle map[string]string  `json:"promptBundle,omitempty"`
	Policies     WorkflowPolicies   `json:"policies,omitempty"`
	Checksum     string             `json:"checksum,omitempty"`
	CreatedBy    string             `json:"createdBy,omitempty"`
	ApprovedBy   []string           `json:"approvedBy,omitempty"`
	PublishedAt  time.Time          `json:"publishedAt"`
	CreatedAt    time.Time          `json:"createdAt"`
}

type WorkflowBinding struct {
	ID          string         `json:"id"`
	Surface     string         `json:"surface" binding:"required"`
	Action      string         `json:"action" binding:"required"`
	TenantID    string         `json:"tenantId,omitempty"`
	WorkflowKey string         `json:"workflowKey,omitempty"`
	ReleaseID   string         `json:"releaseId" binding:"required"`
	Priority    int            `json:"priority,omitempty"`
	Enabled     bool           `json:"enabled"`
	Conditions  map[string]any `json:"conditions,omitempty"`
	CreatedBy   string         `json:"createdBy,omitempty"`
	CreatedAt   time.Time      `json:"createdAt,omitempty"`
	UpdatedAt   time.Time      `json:"updatedAt,omitempty"`
}

type WorkflowCatalogEntry struct {
	Binding WorkflowBinding `json:"binding"`
	Release WorkflowRelease `json:"release"`
}

type WorkflowReleaseStats struct {
	WorkflowReleaseID string    `json:"workflowReleaseId"`
	WorkflowKey       string    `json:"workflowKey,omitempty"`
	WorkflowVersion   int       `json:"workflowVersion,omitempty"`
	TotalRuns         int64     `json:"totalRuns"`
	SucceededRuns     int64     `json:"succeededRuns"`
	FailedRuns        int64     `json:"failedRuns"`
	CancelledRuns     int64     `json:"cancelledRuns"`
	ActiveRuns        int64     `json:"activeRuns"`
	FallbackRuns      int64     `json:"fallbackRuns"`
	SuccessRate       float64   `json:"successRate"`
	AverageDurationMs int64     `json:"averageDurationMs"`
	AverageTokens     float64   `json:"averageTokens"`
	TotalTokens       int64     `json:"totalTokens"`
	LastRunAt         time.Time `json:"lastRunAt,omitempty"`
}
