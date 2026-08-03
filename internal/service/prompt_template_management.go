package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/repository/mysql"
)

type PromptTemplateService struct {
	repo      *mysql.Repository
	publisher WorkflowPublisher
}

func NewPromptTemplateService(repo *mysql.Repository, publisher WorkflowPublisher) *PromptTemplateService {
	return &PromptTemplateService{repo: repo, publisher: publisher}
}

func (s *PromptTemplateService) CreateDraft(req *domain.CreatePromptTemplateDraftRequest, actor string) (*domain.PromptTemplateDraft, error) {
	if req == nil || strings.TrimSpace(req.Key) == "" {
		return nil, errors.New("prompt key is required")
	}
	if err := validatePromptDraft(req.Type, req.SystemTemplate, req.UserTemplate); err != nil {
		return nil, err
	}
	version, err := s.repo.NextPromptTemplateVersion(req.Key)
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	draft := &domain.PromptTemplateDraft{
		ID: "pfd_" + uuid.NewString(), Key: strings.TrimSpace(req.Key), Version: version, Revision: 1,
		Type: req.Type, SystemTemplate: req.SystemTemplate, UserTemplate: req.UserTemplate,
		VariablesSchema: req.VariablesSchema, OutputSchema: req.OutputSchema, ModelConfig: req.ModelConfig,
		Status: domain.PromptDraftStatusDraft, CreatedBy: actor, UpdatedBy: actor, CreatedAt: now, UpdatedAt: now,
	}
	if err := s.repo.CreatePromptTemplateDraft(draft); err != nil {
		return nil, err
	}
	return draft, nil
}

func (s *PromptTemplateService) ListDrafts(status string, page, pageSize int) ([]*domain.PromptTemplateDraft, int64, error) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}
	return s.repo.ListPromptTemplateDrafts(status, page, pageSize)
}

func (s *PromptTemplateService) GetDraft(id string) (*domain.PromptTemplateDraft, []*domain.PromptTemplateApproval, error) {
	draft, err := s.repo.GetPromptTemplateDraft(id)
	if err != nil {
		return nil, nil, err
	}
	approvals, err := s.repo.ListPromptTemplateApprovals(id)
	return draft, approvals, err
}

func (s *PromptTemplateService) CloneReleasedDraft(id, actor string) (*domain.PromptTemplateDraft, error) {
	source, err := s.repo.GetPromptTemplateDraft(id)
	if err != nil {
		return nil, err
	}
	if source.Status != domain.PromptDraftStatusReleased || strings.TrimSpace(source.ReleaseID) == "" {
		return nil, errors.New("only a released prompt can be cloned as the next version")
	}
	return s.CreateDraft(promptDraftCloneRequest(source), actor)
}

func promptDraftCloneRequest(source *domain.PromptTemplateDraft) *domain.CreatePromptTemplateDraftRequest {
	return &domain.CreatePromptTemplateDraftRequest{
		Key: source.Key, Type: source.Type, SystemTemplate: source.SystemTemplate, UserTemplate: source.UserTemplate,
		VariablesSchema: source.VariablesSchema, OutputSchema: source.OutputSchema, ModelConfig: source.ModelConfig,
	}
}

func (s *PromptTemplateService) UpdateDraft(id string, req *domain.UpdatePromptTemplateDraftRequest, actor string) (*domain.PromptTemplateDraft, error) {
	if req == nil {
		return nil, errors.New("prompt update is required")
	}
	if err := validatePromptDraft(req.Type, req.SystemTemplate, req.UserTemplate); err != nil {
		return nil, err
	}
	draft, err := s.repo.GetPromptTemplateDraft(id)
	if err != nil {
		return nil, err
	}
	if draft.Status != domain.PromptDraftStatusDraft && draft.Status != domain.PromptDraftStatusRejected {
		return nil, errors.New("only draft or rejected prompts can be edited")
	}
	if req.Revision != draft.Revision {
		return nil, errors.New("prompt draft revision conflict")
	}
	expected := draft.Revision
	draft.Type, draft.SystemTemplate, draft.UserTemplate = req.Type, req.SystemTemplate, req.UserTemplate
	draft.VariablesSchema, draft.OutputSchema, draft.ModelConfig = req.VariablesSchema, req.OutputSchema, req.ModelConfig
	draft.Status, draft.UpdatedBy, draft.Revision = domain.PromptDraftStatusDraft, actor, draft.Revision+1
	if err := s.repo.UpdatePromptTemplateDraft(draft, expected); err != nil {
		return nil, err
	}
	return s.repo.GetPromptTemplateDraft(id)
}

func (s *PromptTemplateService) Submit(id, actor string) error {
	draft, err := s.repo.GetPromptTemplateDraft(id)
	if err != nil {
		return err
	}
	if err := validatePromptDraft(draft.Type, draft.SystemTemplate, draft.UserTemplate); err != nil {
		return err
	}
	if draft.Status != domain.PromptDraftStatusDraft && draft.Status != domain.PromptDraftStatusRejected {
		return errors.New("prompt is not editable")
	}
	return s.repo.TransitionPromptTemplateDraft(id, draft.Status, domain.PromptDraftStatusReviewing, actor, "", "")
}

func (s *PromptTemplateService) Review(id, reviewer string, req *domain.ReviewWorkflowRequest) error {
	draft, err := s.repo.GetPromptTemplateDraft(id)
	if err != nil {
		return err
	}
	if draft.CreatedBy == reviewer {
		return errors.New("prompt creator cannot approve their own draft")
	}
	switch req.Decision {
	case "approved":
		return s.repo.TransitionPromptTemplateDraft(id, domain.PromptDraftStatusReviewing, domain.PromptDraftStatusApproved, reviewer, req.Decision, req.Comment)
	case "rejected":
		return s.repo.TransitionPromptTemplateDraft(id, domain.PromptDraftStatusReviewing, domain.PromptDraftStatusRejected, reviewer, req.Decision, req.Comment)
	default:
		return errors.New("review decision must be approved or rejected")
	}
}

func (s *PromptTemplateService) Publish(ctx context.Context, id, actor string) (*domain.PromptTemplateVersion, error) {
	if s.publisher == nil {
		return nil, errors.New("prompt publisher unavailable")
	}
	draft, err := s.repo.GetPromptTemplateDraft(id)
	if err != nil {
		return nil, err
	}
	if draft.Status != domain.PromptDraftStatusApproved || len(draft.ApprovedBy) == 0 {
		return nil, errors.New("prompt must be approved before publishing")
	}
	release := &domain.PromptTemplateVersion{
		ID: "ptv_" + strings.TrimPrefix(draft.ID, "pfd_"), Key: draft.Key, Version: draft.Version, Type: draft.Type,
		SystemTemplate: draft.SystemTemplate, UserTemplate: draft.UserTemplate, VariablesSchema: draft.VariablesSchema,
		OutputSchema: draft.OutputSchema, ModelConfig: draft.ModelConfig, CreatedBy: draft.CreatedBy, CreatedAt: time.Now().UTC(),
	}
	saved, err := s.publisher.PublishPromptVersion(ctx, release)
	if err != nil {
		return nil, err
	}
	if err := s.repo.MarkPromptTemplateDraftReleased(id, saved.ID, saved.Checksum, actor); err != nil {
		return nil, err
	}
	return saved, nil
}

func validatePromptDraft(promptType, systemTemplate, userTemplate string) error {
	switch strings.TrimSpace(promptType) {
	case "text", "chat", "image":
	default:
		return errors.New("prompt type must be text, chat or image")
	}
	if strings.TrimSpace(systemTemplate) == "" && strings.TrimSpace(userTemplate) == "" {
		return errors.New("prompt must contain a system or user template")
	}
	return nil
}
