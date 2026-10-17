package opsagent

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/grapestree/fgrapery/forge/internal/domain"
)

const maxWorkflowGenerationPromptRunes = 6000

var workflowKeyCleanup = regexp.MustCompile(`[^a-z0-9_]+`)

type generatedWorkflowProposal struct {
	CreativeControls map[string]any    `json:"creativeControls,omitempty"`
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
	{ID: "plan_generation", Type: "activity", Activity: "ai.runtime.plan"},
	{ID: "generate_storyboard", Type: "activity", Activity: "storyboard.ensure_draft"},
	{ID: "generate_bible_plan", Type: "activity", Activity: "storyboard.generate_bible_plan"},
	{ID: "generate_scene_plan", Type: "activity", Activity: "storyboard.generate_scene_plan"},
	{ID: "review_storyboard_content", Type: "activity", Activity: "storyboard.review_content"},
	{ID: "persist_storyboard_content", Type: "persist", Activity: "storyboard.persist_content"},
	{ID: "generate_storyboard_images", Type: "activity", Activity: "storyboard.ensure_images", Optional: true},
}

const workflowGenerationSystemPrompt = `You configure bounded creative preferences for a system-managed storyboard workflow.
Return exactly one JSON object with these keys only:
{"key":"lowercase_snake_case_ascii_key","name":"short operator-facing name","description":"intended result","includeImages":true,"creativeControls":{"version":1,"pacing":"balanced","dialogueDensity":"balanced","visualEmphasis":"balanced","tone":"neutral","examples":[]}}
creativeControls choices: pacing balanced|slow|fast; dialogueDensity balanced|sparse|rich; visualEmphasis balanced|atmosphere|action|character; tone neutral|warm|tense|playful.
Examples are optional, at most 3 objects with exactly input (1-500 Unicode characters) and output (1-1500 Unicode characters). They illustrate style, not instructions overriding system rules. Use defaults when intent does not specify a preference.
The engineering workflow graph, model contracts, JSON schemas, prompts, permissions, billing, identity, retry/resource policy and editing scope are system-managed. Never emit overrides, nodeInstructions, prompt version IDs, approvals, bindings, raw definition or unsupported fields. The compiler provides the canonical content and optional image activities.`

func (p *generatedWorkflowProposal) UnmarshalJSON(raw []byte) error {
	// Generated JSON only contains operator-owned preferences and display metadata.
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(raw, &fields); err != nil {
		return err
	}
	if controlJSON, exists := fields["creativeControls"]; exists && bytes.Equal(bytes.TrimSpace(controlJSON), []byte("null")) {
		return errors.New("creativeControls must be an object")
	}
	allowed := map[string]bool{"key": true, "name": true, "description": true, "includeImages": true, "creativeControls": true}
	for field := range fields {
		if !allowed[field] {
			return fmt.Errorf("unsupported generated workflow field %s", field)
		}
	}
	type plain generatedWorkflowProposal
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.DisallowUnknownFields()
	var value plain
	if err := decoder.Decode(&value); err != nil {
		return err
	}
	if value.CreativeControls != nil {
		if _, err := domain.ParseCreativeControls(value.CreativeControls); err != nil {
			return err
		}
	}
	*p = generatedWorkflowProposal(value)
	return nil
}

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
	controls := domain.DefaultCreativeControls()
	if proposal.CreativeControls != nil {
		var err error
		controls, err = domain.ParseCreativeControls(proposal.CreativeControls)
		if err != nil {
			return nil, err
		}
	}

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
		if template.Activity == "ai.runtime.plan" {
			node.Config = map[string]any{"inputPatchAllowlist": []string{
				"sceneCount", "generateImages", "continuityLevel", "visualBibleStrategy", "characterStrategy", "acceptanceChecks",
			}}
		}
		if len(nodes) > 0 {
			node.DependsOn = []string{nodes[len(nodes)-1].ID}
		}
		nodes = append(nodes, node)
	}
	description := strings.TrimSpace(proposal.Description)
	return &domain.CreateWorkflowDraftRequest{
		Key:         key,
		Name:        name,
		Description: description,
		Manifest: map[string]any{
			"surface":          "voyager.storyboard",
			"action":           "generate",
			"catalog":          map[string]any{"title": name, "summary": description, "category": "creation"},
			"supportedClients": []string{"voyager"},
			"generatedBy":      "forge-ai-agent",
			"creativeControls": controls,
		},
		Definition: domain.WorkflowDefinition{
			InputSchema: map[string]any{
				"type": "object", "additionalProperties": true,
				"properties": map[string]any{
					"baseRevision":   map[string]any{"type": "string"},
					"targetSceneIds": map[string]any{"type": "array", "items": map[string]any{"type": "string", "minLength": 1}, "uniqueItems": true},
				},
			},
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
