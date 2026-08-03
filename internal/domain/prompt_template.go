package domain

import "time"

const (
	PromptDraftStatusDraft     = "draft"
	PromptDraftStatusReviewing = "reviewing"
	PromptDraftStatusApproved  = "approved"
	PromptDraftStatusRejected  = "rejected"
	PromptDraftStatusReleased  = "released"
)

type PromptTemplateDraft struct {
	ID              string         `json:"id"`
	Key             string         `json:"key"`
	Version         int            `json:"version"`
	Revision        int            `json:"revision"`
	Type            string         `json:"type"`
	SystemTemplate  string         `json:"systemTemplate,omitempty"`
	UserTemplate    string         `json:"userTemplate,omitempty"`
	VariablesSchema map[string]any `json:"variablesSchema,omitempty"`
	OutputSchema    map[string]any `json:"outputSchema,omitempty"`
	ModelConfig     map[string]any `json:"modelConfig,omitempty"`
	Status          string         `json:"status"`
	CreatedBy       string         `json:"createdBy"`
	UpdatedBy       string         `json:"updatedBy"`
	ApprovedBy      []string       `json:"approvedBy,omitempty"`
	ReleaseID       string         `json:"releaseId,omitempty"`
	ReleaseChecksum string         `json:"releaseChecksum,omitempty"`
	CreatedAt       time.Time      `json:"createdAt"`
	UpdatedAt       time.Time      `json:"updatedAt"`
}

type PromptTemplateApproval struct {
	ID         string    `json:"id"`
	DraftID    string    `json:"draftId"`
	ReviewerID string    `json:"reviewerId"`
	Decision   string    `json:"decision"`
	Comment    string    `json:"comment,omitempty"`
	CreatedAt  time.Time `json:"createdAt"`
}

type CreatePromptTemplateDraftRequest struct {
	Key             string         `json:"key" binding:"required"`
	Type            string         `json:"type" binding:"required,oneof=text chat image"`
	SystemTemplate  string         `json:"systemTemplate,omitempty"`
	UserTemplate    string         `json:"userTemplate,omitempty"`
	VariablesSchema map[string]any `json:"variablesSchema,omitempty"`
	OutputSchema    map[string]any `json:"outputSchema,omitempty"`
	ModelConfig     map[string]any `json:"modelConfig,omitempty"`
}

type UpdatePromptTemplateDraftRequest struct {
	Revision        int            `json:"revision" binding:"required"`
	Type            string         `json:"type" binding:"required,oneof=text chat image"`
	SystemTemplate  string         `json:"systemTemplate,omitempty"`
	UserTemplate    string         `json:"userTemplate,omitempty"`
	VariablesSchema map[string]any `json:"variablesSchema,omitempty"`
	OutputSchema    map[string]any `json:"outputSchema,omitempty"`
	ModelConfig     map[string]any `json:"modelConfig,omitempty"`
}

type PromptTemplateVersion struct {
	ID              string         `json:"id"`
	Key             string         `json:"key"`
	Version         int            `json:"version"`
	Type            string         `json:"type"`
	SystemTemplate  string         `json:"systemTemplate,omitempty"`
	UserTemplate    string         `json:"userTemplate,omitempty"`
	VariablesSchema map[string]any `json:"variablesSchema,omitempty"`
	OutputSchema    map[string]any `json:"outputSchema,omitempty"`
	ModelConfig     map[string]any `json:"modelConfig,omitempty"`
	Checksum        string         `json:"checksum,omitempty"`
	CreatedBy       string         `json:"createdBy,omitempty"`
	CreatedAt       time.Time      `json:"createdAt"`
}
