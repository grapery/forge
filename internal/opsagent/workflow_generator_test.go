package opsagent

import "testing"

func TestCompileWorkflowProposalBuildsCanonicalStoryboardPath(t *testing.T) {
	req, err := compileWorkflowProposal(generatedWorkflowProposal{
		Key:              "Premium Trailer Flow",
		Name:             "精品预告片工作流",
		Description:      "生成完整分镜并补齐图片。",
		IncludeImages:    true,
		MaxDurationHours: 6,
		MaxParallelism:   2,
		MaxAttempts:      5,
		NodeInstructions: map[string]string{
			"storyboard.generate_scene_plan": "突出前三秒冲突。",
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if req.Key != "premium_trailer_flow" {
		t.Fatalf("unexpected key %q", req.Key)
	}
	if len(req.Definition.Nodes) != 7 {
		t.Fatalf("expected optional image node, got %d nodes", len(req.Definition.Nodes))
	}
	for i, node := range req.Definition.Nodes {
		if i == 0 && len(node.DependsOn) != 0 {
			t.Fatalf("first node must not have dependencies: %#v", node.DependsOn)
		}
		if i > 0 && (len(node.DependsOn) != 1 || node.DependsOn[0] != req.Definition.Nodes[i-1].ID) {
			t.Fatalf("node %s is not chained to previous node", node.ID)
		}
	}
	if req.Policies.MaxDurationSeconds != 21600 || req.Policies.MaxParallelism != 2 || req.Policies.MaxAttempts != 5 {
		t.Fatalf("unexpected policies: %#v", req.Policies)
	}
	if got := req.Definition.Nodes[3].Config["operatorNote"]; got != "突出前三秒冲突。" {
		t.Fatalf("unexpected node instruction: %#v", got)
	}
	if allowlist, ok := req.Definition.Nodes[0].Config["inputPatchAllowlist"].([]string); !ok || len(allowlist) == 0 {
		t.Fatalf("planner input patch allowlist is missing: %#v", req.Definition.Nodes[0].Config)
	}
}

func TestCompileWorkflowProposalNormalizesUnsafeValues(t *testing.T) {
	req, err := compileWorkflowProposal(generatedWorkflowProposal{
		Key:              "123 -- Demo / Flow",
		Name:             "Demo",
		MaxDurationHours: 99,
		MaxParallelism:   0,
		MaxAttempts:      99,
	})
	if err != nil {
		t.Fatal(err)
	}
	if req.Key != "workflow_123_demo_flow" {
		t.Fatalf("unexpected normalized key %q", req.Key)
	}
	if len(req.Definition.Nodes) != 6 {
		t.Fatalf("images should be omitted, got %d nodes", len(req.Definition.Nodes))
	}
	if req.Policies.MaxDurationSeconds != 43200 || req.Policies.MaxParallelism != 4 || req.Policies.MaxAttempts != 3 {
		t.Fatalf("unexpected fallback policies: %#v", req.Policies)
	}
}

func TestCompileWorkflowProposalKeepsShortWorkflowTimeout(t *testing.T) {
	req, err := compileWorkflowProposal(generatedWorkflowProposal{
		Key: "quick_flow", Name: "Quick flow", MaxDurationHours: 0.25,
		MaxParallelism: 1, MaxAttempts: 1,
	})
	if err != nil {
		t.Fatal(err)
	}
	if req.Policies.MaxDurationSeconds != 900 {
		t.Fatalf("expected 15 minute timeout, got %d seconds", req.Policies.MaxDurationSeconds)
	}
}

func TestExtractJSONObjectHandlesMarkdownFence(t *testing.T) {
	raw, err := extractJSONObject("```json\n{\"name\":\"demo\"}\n```")
	if err != nil || raw != `{"name":"demo"}` {
		t.Fatalf("unexpected extraction %q, %v", raw, err)
	}
}
