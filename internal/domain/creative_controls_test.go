package domain

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestCreativeControlsDefaultsAndStrictBoundaries(t *testing.T) {
	normalized, err := NormalizeWorkflowManifest(map[string]any{"catalog": map[string]any{"title": "kept"}})
	if err != nil || normalized["creativeControls"] != nil {
		t.Fatal("legacy defaults changed manifest")
	}
	controls, err := ParseCreativeControls(map[string]any{"pacing": "slow", "examples": []any{map[string]any{"input": strings.Repeat("雨", 500), "output": strings.Repeat("🌧", 1500)}}})
	if err != nil || controls.Version != 1 || controls.Tone != "neutral" || controls.Pacing != "slow" {
		t.Fatal(controls, err)
	}
	for _, raw := range []string{`null`, `[]`, `{"version":2}`, `{"version":1.1}`, `{"version":null}`, `{"tone":null}`, `{"pacing":""}`, `{"tone":"grim"}`, `{"systemPrompt":"override"}`, `{"examples":null}`, `{"examples":[{"input":"a","output":"b","systemPrompt":"override"}]}`, `{"examples":[{"input":" ","output":"b"}]}`, `{"examples":[{"input":"a"}]}`, `{"examples":[{"input":"a","output":"b"},{"input":"a","output":"b"},{"input":"a","output":"b"},{"input":"a","output":"b"}]}`} {
		var value any
		if err := json.Unmarshal([]byte(raw), &value); err != nil {
			t.Fatal(err)
		}
		if _, err := ParseCreativeControls(value); err == nil {
			t.Fatalf("accepted invalid %s", raw)
		}
	}
	for _, example := range []CreativeControlExample{{Input: strings.Repeat("雨", 501), Output: "ok"}, {Input: "ok", Output: strings.Repeat("🌧", 1501)}} {
		if _, err := ParseCreativeControls(map[string]any{"examples": []CreativeControlExample{example}}); err == nil {
			t.Fatal("overlong Unicode example accepted")
		}
	}
}
func TestCreativeControlsNormalizationDoesNotMutateCallerAndSurvivesVersionJSON(t *testing.T) {
	source := map[string]any{"catalog": map[string]any{"title": "kept"}, "creativeControls": map[string]any{"tone": "warm"}}
	normalized, err := NormalizeWorkflowManifest(source)
	if err != nil {
		t.Fatal(err)
	}
	if _, exists := source["creativeControls"].(map[string]any)["version"]; exists {
		t.Fatal("caller manifest was mutated")
	}
	raw, err := json.Marshal(WorkflowRelease{Manifest: normalized})
	if err != nil {
		t.Fatal(err)
	}
	var release WorkflowRelease
	if err := json.Unmarshal(raw, &release); err != nil {
		t.Fatal(err)
	}
	controls, err := ParseCreativeControls(release.Manifest["creativeControls"])
	if err != nil || controls.Tone != "warm" || controls.Version != 1 {
		t.Fatal("controls lost in immutable release", err)
	}
}
