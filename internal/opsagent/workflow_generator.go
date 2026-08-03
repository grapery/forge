package opsagent

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/grapestree/fgrapery/forge/internal/domain"
)

const maxWorkflowGenerationPromptRunes = 6000

var workflowKeyCleanup = regexp.MustCompile(`[^a-z0-9_]+`)

type generatedWorkflowProposal struct {
	Key              string            `json:"key"`
	Name             string            `json:"name"`
	Description      string            `json:"description"`
	IncludeImages    bool              `json:"includeImages"`
	MaxDurationHours float64           `json:"maxDurationHours"`
	MaxParallelism   int               `json:"maxParallelism"`
	MaxAttempts      int               `json:"maxAttempts"`
	NodeInstructions map[string]string `json:"nodeInstructions"`
}

var storyboardWorkflowNodes = []struct {
	ID       string
	Type     string
	Activity string
	Optional bool
}{
	{ID: "generate_storyboard", Type: "activity", Activity: "storyboard.ensure_draft"},
	{ID: "generate_bible_plan", Type: "activity", Activity: "storyboard.generate_bible_plan"},
	{ID: "generate_scene_plan", Type: "activity", Activity: "storyboard.generate_scene_plan"},
	{ID: "persist_storyboard_content", Type: "persist", Activity: "storyboard.persist_content"},
	{ID: "generate_storyboard_images", Type: "activity", Activity: "storyboard.ensure_images", Optional: true},
}

const workflowGenerationSystemPrompt = `You design storyboard-generation workflows for non-technical operators.
Return exactly one JSON object and no prose. Use this schema:
{
  "key": "lowercase_snake_case_ascii_key",
  "name": "short operator-facing name",
  "description": "clear purpose and intended result",
  "includeImages": true,
  "maxDurationHours": 12,
  "maxParallelism": 4,
  "maxAttempts": 3,
  "nodeInstructions": {
    "storyboard.ensure_draft": "specific operating instruction",
    "storyboard.generate_bible_plan": "specific operating instruction",
    "storyboard.generate_scene_plan": "specific operating instruction",
    "storyboard.persist_content": "specific operating instruction",
    "storyboard.ensure_images": "specific operating instruction"
  }
}
Only the five listed activities are supported. The first four are mandatory and ordered as shown. Images are optional.
Translate the operator's intent into practical, concise node instructions. Do not invent prompt version IDs, approvals, bindings, or unsupported activities.
maxDurationHours must be between 0.0834 (about 5 minutes) and 12, maxParallelism between 1 and 32, and maxAttempts between 1 and 10.`

// GenerateWorkflowDraft converts operator intent into a validated, canonical
// storyboard workflow request. The generated value is not persisted here.
func GenerateWorkflowDraft(ctx context.Context, llm LLMConfig, prompt string) (*domain.CreateWorkflowDraftRequest, error) {
	prompt = strings.TrimSpace(prompt)
	if prompt == "" {
		return nil, errors.New("workflow requirements are required")
	}
	runes := []rune(prompt)
	if len(runes) > maxWorkflowGenerationPromptRunes {
		prompt = string(runes[:maxWorkflowGenerationPromptRunes])
	}
	var proposal generatedWorkflowProposal
	if err := llm.CompleteJSON(ctx, workflowGenerationSystemPrompt, prompt, &proposal); err != nil {
		return nil, err
	}
	return compileWorkflowProposal(proposal)
}

func compileWorkflowProposal(proposal generatedWorkflowProposal) (*domain.CreateWorkflowDraftRequest, error) {
	name := strings.TrimSpace(proposal.Name)
	if name == "" {
		return nil, errors.New("AI did not provide a workflow name")
	}
	key := normalizeWorkflowKey(proposal.Key)
	if key == "" {
		key = normalizeWorkflowKey(name)
	}
	if key == "" {
		return nil, errors.New("AI did not provide a valid ASCII workflow key")
	}
	duration := proposal.MaxDurationHours
	if duration < 5.0/60.0 || duration > 12 {
		duration = 12
	}
	parallelism := proposal.MaxParallelism
	if parallelism < 1 || parallelism > 32 {
		parallelism = 4
	}
	attempts := proposal.MaxAttempts
	if attempts < 1 || attempts > 10 {
		attempts = 3
	}

	nodes := make([]domain.WorkflowNode, 0, len(storyboardWorkflowNodes))
	for _, template := range storyboardWorkflowNodes {
		if template.Optional && !proposal.IncludeImages {
			continue
		}
		node := domain.WorkflowNode{ID: template.ID, Type: template.Type, Activity: template.Activity}
		if len(nodes) > 0 {
			node.DependsOn = []string{nodes[len(nodes)-1].ID}
		}
		if note := strings.TrimSpace(proposal.NodeInstructions[template.Activity]); note != "" {
			node.Config = map[string]any{"operatorNote": note}
		}
		nodes = append(nodes, node)
	}
	description := strings.TrimSpace(proposal.Description)
	return &domain.CreateWorkflowDraftRequest{
		Key:         key,
		Name:        name,
		Description: description,
		Manifest: map[string]any{
			"catalog":          map[string]any{"title": name, "summary": description, "category": "creation"},
			"supportedClients": []string{"voyager"},
			"generatedBy":      "forge-ai-agent",
		},
		Definition: domain.WorkflowDefinition{
			InputSchema:  map[string]any{"type": "object", "properties": map[string]any{}},
			OutputSchema: map[string]any{"type": "object", "properties": map[string]any{}},
			Nodes:        nodes,
		},
		PromptBundle: map[string]string{},
		Policies: domain.WorkflowPolicies{
			MaxDurationSeconds: int(duration * 3600),
			MaxParallelism:     parallelism,
			MaxAttempts:        attempts,
		},
	}, nil
}

func normalizeWorkflowKey(raw string) string {
	key := strings.ToLower(strings.TrimSpace(raw))
	key = strings.ReplaceAll(key, "-", "_")
	key = strings.ReplaceAll(key, " ", "_")
	key = workflowKeyCleanup.ReplaceAllString(key, "_")
	key = strings.Trim(key, "_")
	key = regexp.MustCompile(`_+`).ReplaceAllString(key, "_")
	if len(key) > 80 {
		key = strings.TrimRight(key[:80], "_")
	}
	if key == "" {
		return ""
	}
	if key[0] >= '0' && key[0] <= '9' {
		key = fmt.Sprintf("workflow_%s", key)
	}
	return key
}
