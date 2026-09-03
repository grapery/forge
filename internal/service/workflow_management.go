package service

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/repository/mysql"
	"go.uber.org/zap"
)

type WorkflowService struct {
	repo       *mysql.Repository
	publisher  WorkflowPublisher
	logger     *zap.Logger
	contentSvc *ContentService
}

func NewWorkflowService(repo *mysql.Repository, publisher WorkflowPublisher, logger *zap.Logger, contentSvc *ContentService) *WorkflowService {
	return &WorkflowService{repo: repo, publisher: publisher, logger: logger, contentSvc: contentSvc}
}

func (s *WorkflowService) CreateDraft(req *domain.CreateWorkflowDraftRequest, actor string) (*domain.WorkflowDraft, error) {
	if req == nil || strings.TrimSpace(req.Key) == "" || strings.TrimSpace(req.Name) == "" {
		return nil, errors.New("workflow key and name are required")
	}
	if err := validateForgeWorkflow(req.Definition, req.Policies); err != nil {
		return nil, err
	}
	if err := validateForgePromptBundle(req.Definition, req.PromptBundle); err != nil {
		return nil, err
	}
	version, err := s.repo.NextWorkflowVersion(req.Key)
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	draft := &domain.WorkflowDraft{
		ID: "wfd_" + uuid.NewString(), Key: strings.TrimSpace(req.Key), Version: version, Revision: 1,
		Name: strings.TrimSpace(req.Name), Description: req.Description, Status: domain.WorkflowDraftStatusDraft,
		Manifest: req.Manifest, Definition: req.Definition, PromptBundle: req.PromptBundle, Policies: req.Policies,
		CreatedBy: actor, UpdatedBy: actor, CreatedAt: now, UpdatedAt: now,
	}
	if err := s.repo.CreateWorkflowDraft(draft); err != nil {
		return nil, err
	}
	return draft, nil
}

func (s *WorkflowService) ListDrafts(status string, page, pageSize int) ([]*domain.WorkflowDraft, int64, error) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}
	return s.repo.ListWorkflowDrafts(status, page, pageSize)
}

func (s *WorkflowService) GetDraft(id string) (*domain.WorkflowDraft, []*domain.WorkflowApproval, error) {
	draft, err := s.repo.GetWorkflowDraft(id)
	if err != nil {
		return nil, nil, err
	}
	approvals, err := s.repo.ListWorkflowApprovals(id)
	return draft, approvals, err
}

// CloneReleasedDraft creates the next editable version from an immutable
// release-backed draft. Approval and release metadata are intentionally reset.
func (s *WorkflowService) CloneReleasedDraft(id, actor string) (*domain.WorkflowDraft, error) {
	source, err := s.repo.GetWorkflowDraft(id)
	if err != nil {
		return nil, err
	}
	if source.Status != domain.WorkflowDraftStatusReleased || strings.TrimSpace(source.ReleaseID) == "" {
		return nil, errors.New("only a released workflow can be cloned as the next version")
	}
	return s.CreateDraft(workflowDraftCloneRequest(source), actor)
}

func workflowDraftCloneRequest(source *domain.WorkflowDraft) *domain.CreateWorkflowDraftRequest {
	return &domain.CreateWorkflowDraftRequest{
		Key: source.Key, Name: source.Name, Description: source.Description,
		Manifest: source.Manifest, Definition: source.Definition,
		PromptBundle: source.PromptBundle, Policies: source.Policies,
	}
}

func (s *WorkflowService) UpdateDraft(id string, req *domain.UpdateWorkflowDraftRequest, actor string) (*domain.WorkflowDraft, error) {
	if req == nil {
		return nil, errors.New("workflow update is required")
	}
	if err := validateForgeWorkflow(req.Definition, req.Policies); err != nil {
		return nil, err
	}
	if err := validateForgePromptBundle(req.Definition, req.PromptBundle); err != nil {
		return nil, err
	}
	draft, err := s.repo.GetWorkflowDraft(id)
	if err != nil {
		return nil, err
	}
	if draft.Status != domain.WorkflowDraftStatusDraft && draft.Status != domain.WorkflowDraftStatusRejected {
		return nil, errors.New("only draft or rejected workflows can be edited")
	}
	expected := req.Revision
	if expected != draft.Revision {
		return nil, errors.New("workflow draft revision conflict")
	}
	draft.Name, draft.Description = strings.TrimSpace(req.Name), req.Description
	draft.Manifest, draft.Definition, draft.PromptBundle, draft.Policies = req.Manifest, req.Definition, req.PromptBundle, req.Policies
	draft.Status, draft.UpdatedBy, draft.Revision = domain.WorkflowDraftStatusDraft, actor, draft.Revision+1
	if err := s.repo.UpdateWorkflowDraft(draft, expected); err != nil {
		return nil, err
	}
	return s.repo.GetWorkflowDraft(id)
}

func (s *WorkflowService) SubmitForReview(id, actor string) error {
	draft, err := s.repo.GetWorkflowDraft(id)
	if err != nil {
		return err
	}
	if err := validateForgeWorkflow(draft.Definition, draft.Policies); err != nil {
		return err
	}
	if err := validateForgePromptBundle(draft.Definition, draft.PromptBundle); err != nil {
		return err
	}
	if draft.Status != domain.WorkflowDraftStatusDraft && draft.Status != domain.WorkflowDraftStatusRejected {
		return errors.New("workflow is not editable")
	}
	return s.repo.TransitionWorkflowDraft(id, draft.Status, domain.WorkflowDraftStatusReviewing, actor, "", "")
}

func (s *WorkflowService) Review(id, reviewer string, reviewerRole domain.AdminRole, req *domain.ReviewWorkflowRequest) error {
	draft, err := s.repo.GetWorkflowDraft(id)
	if err != nil {
		return err
	}
	if !canReviewWorkflow(draft.CreatedBy, reviewer, reviewerRole) {
		return errors.New("workflow creator cannot review their own draft")
	}
	if req.Decision == "approved" {
		return s.repo.TransitionWorkflowDraft(id, domain.WorkflowDraftStatusReviewing, domain.WorkflowDraftStatusApproved, reviewer, req.Decision, req.Comment)
	}
	if req.Decision == "rejected" {
		return s.repo.TransitionWorkflowDraft(id, domain.WorkflowDraftStatusReviewing, domain.WorkflowDraftStatusRejected, reviewer, req.Decision, req.Comment)
	}
	return errors.New("review decision must be approved or rejected")
}

func canReviewWorkflow(creatorID, reviewerID string, reviewerRole domain.AdminRole) bool {
	return creatorID != reviewerID || reviewerRole == domain.RoleSuperAdmin
}

func (s *WorkflowService) Publish(ctx context.Context, id, actor string) (*domain.WorkflowRelease, error) {
	if s.publisher == nil {
		return nil, errors.New("workflow publisher unavailable")
	}
	draft, err := s.repo.GetWorkflowDraft(id)
	if err != nil {
		return nil, err
	}
	if draft.Status != domain.WorkflowDraftStatusApproved || len(draft.ApprovedBy) == 0 {
		return nil, errors.New("workflow must be approved before publishing")
	}
	now := time.Now().UTC()
	release := &domain.WorkflowRelease{
		ID: "wfr_" + strings.TrimPrefix(draft.ID, "wfd_"), Key: draft.Key, Version: draft.Version,
		Name: draft.Name, Description: draft.Description, Status: "released", Manifest: draft.Manifest,
		Definition: draft.Definition, PromptBundle: draft.PromptBundle, Policies: draft.Policies,
		CreatedBy: draft.CreatedBy, ApprovedBy: draft.ApprovedBy, PublishedAt: now, CreatedAt: now,
	}
	saved, err := s.publisher.PublishRelease(ctx, release)
	if err != nil {
		return nil, err
	}
	if err := s.repo.MarkWorkflowDraftReleased(id, saved.ID, saved.Checksum, actor); err != nil {
		return nil, err
	}
	return saved, nil
}

func (s *WorkflowService) SaveBinding(ctx context.Context, binding *domain.WorkflowBinding, actor string) (*domain.WorkflowBinding, error) {
	if s.publisher == nil {
		return nil, errors.New("workflow publisher unavailable")
	}
	if binding == nil || strings.TrimSpace(binding.Surface) == "" || strings.TrimSpace(binding.Action) == "" || strings.TrimSpace(binding.WorkflowKey) == "" || strings.TrimSpace(binding.ReleaseID) == "" {
		return nil, errors.New("workflow binding surface, action, workflow key and release id are required")
	}
	binding.Surface, binding.Action = strings.TrimSpace(binding.Surface), strings.TrimSpace(binding.Action)
	binding.TenantID, binding.WorkflowKey, binding.ReleaseID = strings.TrimSpace(binding.TenantID), strings.TrimSpace(binding.WorkflowKey), strings.TrimSpace(binding.ReleaseID)
	if binding.ID == "" {
		binding.ID = stableWorkflowBindingID(binding)
	}
	binding.CreatedBy = actor
	return s.publisher.SaveBinding(ctx, binding)
}

func (s *WorkflowService) ListBindings(ctx context.Context, surface, action, tenantID string) ([]domain.WorkflowCatalogEntry, error) {
	if s.publisher == nil {
		return nil, errors.New("workflow publisher unavailable")
	}
	if strings.TrimSpace(surface) == "" || strings.TrimSpace(action) == "" {
		return nil, errors.New("workflow binding surface and action are required")
	}
	return s.publisher.ListCatalog(ctx, surface, action, tenantID)
}

func (s *WorkflowService) PauseReleaseBindings(ctx context.Context, releaseID string) (int64, error) {
	if s.publisher == nil {
		return 0, errors.New("workflow publisher unavailable")
	}
	return s.publisher.PauseReleaseBindings(ctx, strings.TrimSpace(releaseID))
}

func (s *WorkflowService) RebindWorkflowBindings(ctx context.Context, releaseID, surface, action, workflowKey string) (int64, error) {
	if s.publisher == nil {
		return 0, errors.New("workflow publisher unavailable")
	}
	return s.publisher.RebindWorkflowBindings(ctx, releaseID, surface, action, workflowKey)
}

// StartTestRun 对已发布版本发起一次真实运行，并把试运行档案持久化到 forge，
// 供运营人员在网页端回溯验证历史。
func (s *WorkflowService) StartTestRun(ctx context.Context, actor string, draft *domain.WorkflowDraft, surface, action string, input map[string]any) (*domain.WorkflowTestRun, error) {
	if s.publisher == nil {
		return nil, errors.New("workflow publisher unavailable")
	}
	if draft == nil || strings.TrimSpace(draft.ReleaseID) == "" {
		return nil, errors.New("workflow release is required for a test run")
	}
	result, err := s.publisher.StartWorkflowTestRun(ctx, surface, action, draft.ReleaseID, input)
	if err != nil {
		return nil, err
	}
	runID, _ := result["id"].(string)
	if runID == "" {
		runID, _ = result["runId"].(string)
	}
	if strings.TrimSpace(runID) == "" {
		return nil, errors.New("agent test run did not return a run id")
	}
	status, _ := result["status"].(string)
	if strings.TrimSpace(status) == "" {
		status = "pending"
	}
	inputJSON, err := json.Marshal(input)
	if err != nil {
		inputJSON = []byte("{}")
	}
	record := &domain.WorkflowTestRun{
		WorkflowKey: draft.Key,
		ReleaseID:   draft.ReleaseID,
		Version:     draft.Version,
		Surface:     surface,
		Action:      action,
		Input:       string(inputJSON),
		RunID:       runID,
		Status:      status,
		TriggeredBy: actor,
	}
	if output, ok := result["output"]; ok {
		if raw, marshalErr := json.Marshal(output); marshalErr == nil {
			record.Output = string(raw)
		}
	}
	if tokens, ok := result["tokensUsed"].(float64); ok {
		record.TokensUsed = int(tokens)
	}
	if err := s.repo.CreateWorkflowTestRun(record); err != nil {
		s.logger.Error("persist workflow test run", zap.Error(err))
	}
	return record, nil
}

// TestRunStatus 拉取运行状态并同步回试运行档案；节点级执行明细由 grapery
// generation_executions 持久化，这里保留运营侧看到的最终结果。
func (s *WorkflowService) TestRunStatus(ctx context.Context, runID string) (map[string]any, error) {
	if s.publisher == nil {
		return nil, errors.New("workflow publisher unavailable")
	}
	result, err := s.publisher.GetWorkflowTestRun(ctx, runID)
	if err != nil {
		return nil, err
	}
	record, recordErr := s.repo.GetWorkflowTestRunByRunID(strings.TrimSpace(runID))
	if recordErr != nil || record == nil {
		return result, nil
	}
	if status, ok := result["status"].(string); ok && strings.TrimSpace(status) != "" {
		record.Status = status
	}
	if errMsg, ok := result["error"].(string); ok {
		record.Error = errMsg
	} else {
		record.Error = ""
	}
	if output, ok := result["output"]; ok {
		if raw, marshalErr := json.Marshal(output); marshalErr == nil {
			record.Output = string(raw)
		}
	}
	if tokens, ok := result["tokensUsed"].(float64); ok {
		record.TokensUsed = int(tokens)
	}
	if err := s.repo.SaveWorkflowTestRun(record); err != nil {
		s.logger.Error("persist workflow test run status", zap.Error(err))
	}
	return result, nil
}

func (s *WorkflowService) ListTestRuns(releaseID string, limit int) ([]*domain.WorkflowTestRun, error) {
	return s.repo.ListWorkflowTestRuns(strings.TrimSpace(releaseID), limit)
}

// TestRunResult 聚合一次试运行的档案与产物内容：运行输出里的
// storyboardId/draftStoryboardId（分支流程取 branchBatch 的候选列表）会
// 被解析为具体的故事板摘要，供 forge 网页端直接查看生成效果。
func (s *WorkflowService) TestRunResult(runID string) (map[string]any, error) {
	record, err := s.repo.GetWorkflowTestRunByRunID(strings.TrimSpace(runID))
	if err != nil {
		return nil, err
	}
	result := map[string]any{"run": record}
	var output map[string]any
	if record.Output != "" {
		_ = json.Unmarshal([]byte(record.Output), &output)
	}
	if output == nil {
		return result, nil
	}
	sbIDs := make([]string, 0, 4)
	if nodeOutputs, ok := output["nodeOutputs"].(map[string]any); ok {
		for _, v := range nodeOutputs {
			node, _ := v.(map[string]any)
			if node == nil {
				continue
			}
			for _, key := range []string{"storyboardId", "draftStoryboardId", "id"} {
				if id, ok := node[key].(string); ok && strings.HasPrefix(id, "") && isUUIDLike(id) && !containsStr(sbIDs, id) {
					sbIDs = append(sbIDs, id)
				}
			}
		}
	}
	if batch, ok := output["branchBatch"].(map[string]any); ok {
		if candidates, ok := batch["candidates"].([]any); ok {
			summaries := make([]map[string]any, 0, len(candidates))
			for _, raw := range candidates {
				cand, _ := raw.(map[string]any)
				if cand == nil {
					continue
				}
				summary := map[string]any{
					"strategy": cand["strategy"], "narrativeHook": cand["narrativeHook"],
					"communityAppeal": cand["communityAppeal"], "diffFromParent": cand["diffFromParent"],
					"rawInput": cand["rawInput"],
				}
				if id, ok := cand["storyboardId"].(string); ok && isUUIDLike(id) {
					summary["storyboardId"] = id
					if detail := s.storyboardSummary(id); detail != nil {
						summary["storyboard"] = detail
					}
				}
				if meta, ok := cand["metadata"].(map[string]any); ok {
					if errMsg, ok := meta["error"].(string); ok {
						summary["error"] = errMsg
					}
				}
				summaries = append(summaries, summary)
			}
			result["branches"] = summaries
		}
	}
	if len(sbIDs) > 0 {
		storyboards := make([]map[string]any, 0, len(sbIDs))
		for _, id := range sbIDs {
			if summary := s.storyboardSummary(id); summary != nil {
				storyboards = append(storyboards, summary)
			}
		}
		result["storyboards"] = storyboards
	}
	return result, nil
}

func (s *WorkflowService) storyboardSummary(id string) map[string]any {
	detail, err := s.contentSvc.GetContentDetail("storyboard", id)
	if err != nil {
		return nil
	}
	summary := map[string]any{"id": id}
	if title, ok := detail["title"].(string); ok {
		summary["title"] = title
	}
	if content, ok := detail["content"].(string); ok {
		summary["content"] = content
	}
	if summaryStr, ok := detail["continuation_summary"].(string); ok && summaryStr != "" {
		summary["summary"] = summaryStr
	}
	if raw, ok := detail["raw_input"].(string); ok {
		summary["rawInput"] = raw
	}
	if status, ok := detail["workflow_status"].(string); ok {
		summary["status"] = status
	}
	if step, ok := detail["current_step"].(string); ok {
		summary["currentStep"] = step
	}
	if sceneCount, ok := detail["scene_count"]; ok {
		summary["sceneCount"] = sceneCount
	}
	return summary
}

func isUUIDLike(id string) bool {
	id = strings.TrimSpace(id)
	if len(id) < 32 {
		return false
	}
	for _, c := range id {
		if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F') || c == '-') {
			return false
		}
	}
	return true
}

func containsStr(items []string, target string) bool {
	for _, item := range items {
		if item == target {
			return true
		}
	}
	return false
}

func (s *WorkflowService) ReleaseStats(ctx context.Context, days int) ([]domain.WorkflowReleaseStats, error) {
	if s.publisher == nil {
		return nil, errors.New("workflow publisher unavailable")
	}
	if days <= 0 {
		days = 30
	}
	if days > 365 {
		return nil, errors.New("workflow stats range cannot exceed 365 days")
	}
	return s.publisher.ReleaseStats(ctx, days)
}

func stableWorkflowBindingID(binding *domain.WorkflowBinding) string {
	identity := strings.Join([]string{
		strings.TrimSpace(binding.Surface), strings.TrimSpace(binding.Action),
		strings.TrimSpace(binding.TenantID), strings.TrimSpace(binding.WorkflowKey),
		fmt.Sprintf("%d", binding.Priority),
	}, "\x1f")
	sum := sha256.Sum256([]byte(identity))
	return fmt.Sprintf("wfb_%x", sum[:16])
}

func validateForgeWorkflow(definition domain.WorkflowDefinition, policies domain.WorkflowPolicies) error {
	if len(definition.Nodes) == 0 || len(definition.Nodes) > 200 {
		return errors.New("workflow must contain between 1 and 200 nodes")
	}
	if policies.MaxDurationSeconds < 0 || policies.MaxDurationSeconds > 43200 {
		return errors.New("max duration must be between 0 and 43200 seconds")
	}
	if policies.MaxParallelism < 0 || policies.MaxParallelism > 32 {
		return errors.New("max parallelism must be between 0 and 32")
	}
	if policies.MaxAttempts < 0 || policies.MaxAttempts > 10 {
		return errors.New("max attempts must be between 0 and 10")
	}
	allowed := map[string]bool{"activity": true, "persist": true, "condition": true, "parallel": true, "foreach": true, "wait": true, "human_input": true, "sub_workflow": true}
	byID := map[string]domain.WorkflowNode{}
	for _, node := range definition.Nodes {
		if strings.TrimSpace(node.ID) == "" || !allowed[node.Type] {
			return fmt.Errorf("invalid workflow node %q", node.ID)
		}
		if _, exists := byID[node.ID]; exists {
			return fmt.Errorf("duplicate workflow node %s", node.ID)
		}
		if (node.Type == "activity" || node.Type == "persist") && strings.TrimSpace(node.Activity) == "" {
			return fmt.Errorf("node %s requires an activity", node.ID)
		}
		if err := validateForgeNodeConfig(node); err != nil {
			return err
		}
		byID[node.ID] = node
	}
	indegree, children := map[string]int{}, map[string][]string{}
	for _, node := range definition.Nodes {
		seen := map[string]bool{}
		for _, dep := range node.DependsOn {
			if dep == node.ID {
				return fmt.Errorf("node %s depends on itself", node.ID)
			}
			if _, ok := byID[dep]; !ok {
				return fmt.Errorf("node %s depends on unknown node %s", node.ID, dep)
			}
			if !seen[dep] {
				seen[dep] = true
				indegree[node.ID]++
				children[dep] = append(children[dep], node.ID)
			}
		}
	}
	var ready []string
	for id := range byID {
		if indegree[id] == 0 {
			ready = append(ready, id)
		}
	}
	visited := 0
	for len(ready) > 0 {
		id := ready[0]
		ready = ready[1:]
		visited++
		for _, child := range children[id] {
			indegree[child]--
			if indegree[child] == 0 {
				ready = append(ready, child)
			}
		}
	}
	if visited != len(byID) {
		return errors.New("workflow graph contains a cycle")
	}
	return nil
}

// Runtime activities currently expose one operator-owned configuration
// contract. Prompt/model configuration is versioned through PromptBundle and
// must not be duplicated as inert arbitrary JSON on a node.
func validateForgeNodeConfig(node domain.WorkflowNode) error {
	for key, value := range node.Config {
		if key != "inputDefaults" {
			return fmt.Errorf("node %s has unsupported runtime config %s", node.ID, key)
		}
		if _, ok := value.(map[string]any); !ok {
			return fmt.Errorf("node %s inputDefaults must be an object", node.ID)
		}
	}
	return nil
}

func validateForgePromptBundle(definition domain.WorkflowDefinition, bundle map[string]string) error {
	nodes := make(map[string]bool, len(definition.Nodes))
	for _, node := range definition.Nodes {
		nodes[node.ID] = true
	}
	for bindingKey, promptID := range bundle {
		nodeID, slot, valid := parseForgePromptBindingKey(bindingKey)
		if !valid {
			return fmt.Errorf("invalid prompt bundle key %s", bindingKey)
		}
		if !nodes[nodeID] {
			return fmt.Errorf("prompt bundle key %s references unknown node %s", bindingKey, nodeID)
		}
		if strings.TrimSpace(promptID) == "" {
			return fmt.Errorf("prompt bundle key %s has an empty prompt version", bindingKey)
		}
		if slot != "" && !validPromptSlot(slot) {
			return fmt.Errorf("prompt bundle key %s has an invalid slot", bindingKey)
		}
	}
	return nil
}

func parseForgePromptBindingKey(key string) (string, string, bool) {
	key = strings.TrimSpace(key)
	if key == "" || strings.Count(key, ":") > 1 {
		return "", "", false
	}
	nodeID, slot, hasSlot := strings.Cut(key, ":")
	if strings.TrimSpace(nodeID) == "" || (hasSlot && strings.TrimSpace(slot) == "") {
		return "", "", false
	}
	return strings.TrimSpace(nodeID), strings.TrimSpace(slot), true
}

func validPromptSlot(slot string) bool {
	for _, char := range slot {
		if (char >= 'a' && char <= 'z') || (char >= '0' && char <= '9') || char == '_' || char == '-' || char == '.' {
			continue
		}
		return false
	}
	return true
}
