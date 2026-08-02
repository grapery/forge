package opsagent

import "testing"

func TestGetAnalysisSkill(t *testing.T) {
	s := GetAnalysisSkill("growth")
	if s == nil || s.ID != "growth" {
		t.Fatal("expected growth skill")
	}
	if len(s.SuggestedTools) == 0 {
		t.Fatal("expected suggested tools")
	}
	if GetAnalysisSkill("nope") != nil {
		t.Fatal("unknown skill should be nil")
	}
}

func TestListAnalysisSkills(t *testing.T) {
	list := ListAnalysisSkills()
	if len(list) < 4 {
		t.Fatalf("expected several skills, got %d", len(list))
	}
}
