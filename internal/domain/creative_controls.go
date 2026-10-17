package domain

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strings"
	"unicode/utf8"
)

// CreativeControls contains operator-owned creative preferences only. Runtime
// contracts, permissions, billing, identity and edit scope stay system-owned.
type CreativeControls struct {
	Version         int                      `json:"version"`
	Pacing          string                   `json:"pacing"`
	DialogueDensity string                   `json:"dialogueDensity"`
	VisualEmphasis  string                   `json:"visualEmphasis"`
	Tone            string                   `json:"tone"`
	Examples        []CreativeControlExample `json:"examples,omitempty"`
}
type CreativeControlExample struct {
	Input  string `json:"input"`
	Output string `json:"output"`
}

func DefaultCreativeControls() CreativeControls {
	return CreativeControls{Version: 1, Pacing: "balanced", DialogueDensity: "balanced", VisualEmphasis: "balanced", Tone: "neutral"}
}
func ParseCreativeControls(value any) (CreativeControls, error) {
	controls := DefaultCreativeControls()
	raw, err := json.Marshal(value)
	if err != nil {
		return controls, fmt.Errorf("creativeControls: %w", err)
	}
	var object map[string]json.RawMessage
	if err := json.Unmarshal(raw, &object); err != nil || object == nil {
		return controls, fmt.Errorf("creativeControls must be an object")
	}
	for key, value := range object {
		if bytes.Equal(bytes.TrimSpace(value), []byte("null")) {
			return controls, fmt.Errorf("creativeControls.%s cannot be null", key)
		}
	}
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&controls); err != nil {
		return controls, fmt.Errorf("creativeControls: %w", err)
	}
	if controls.Version != 1 {
		return controls, fmt.Errorf("creativeControls.version must be 1")
	}
	enums := map[string]struct {
		value   string
		allowed []string
	}{
		"pacing":          {controls.Pacing, []string{"balanced", "slow", "fast"}},
		"dialogueDensity": {controls.DialogueDensity, []string{"balanced", "sparse", "rich"}},
		"visualEmphasis":  {controls.VisualEmphasis, []string{"balanced", "atmosphere", "action", "character"}},
		"tone":            {controls.Tone, []string{"neutral", "warm", "tense", "playful"}},
	}
	for key, entry := range enums {
		valid := false
		for _, allowed := range entry.allowed {
			if entry.value == allowed {
				valid = true
			}
		}
		if !valid {
			return controls, fmt.Errorf("invalid creativeControls.%s", key)
		}
	}
	if len(controls.Examples) > 3 {
		return controls, fmt.Errorf("creativeControls.examples must contain at most 3 examples")
	}
	for i, example := range controls.Examples {
		if strings.TrimSpace(example.Input) == "" || strings.TrimSpace(example.Output) == "" {
			return controls, fmt.Errorf("creativeControls.examples[%d] input and output are required", i)
		}
		if utf8.RuneCountInString(example.Input) > 500 || utf8.RuneCountInString(example.Output) > 1500 {
			return controls, fmt.Errorf("creativeControls.examples[%d] exceeds the input/output limit", i)
		}
	}
	return controls, nil
}

// Normalize validates the optional extension without mutating the caller or
// rewriting absent controls on legacy releases. Missing controls mean defaults.
func NormalizeWorkflowManifest(manifest map[string]any) (map[string]any, error) {
	if manifest == nil {
		return nil, nil
	}
	out := make(map[string]any, len(manifest))
	for key, value := range manifest {
		out[key] = value
	}
	raw, present := manifest["creativeControls"]
	if !present {
		return out, nil
	}
	controls, err := ParseCreativeControls(raw)
	if err != nil {
		return nil, err
	}
	out["creativeControls"] = controls
	return out, nil
}
