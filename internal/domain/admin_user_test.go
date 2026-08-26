package domain

import "testing"

func TestPermissionGrantsContentModerationMigration(t *testing.T) {
	tests := []struct {
		granted  string
		required string
		want     bool
	}{
		{PermContent, PermContent, true},
		{PermContent, PermContentModerate, true},
		{PermContentModerate, PermContent, true},
		{PermContentModerate, PermContentModerate, true},
		{PermContent, PermUsers, false},
		{PermReports, PermContentModerate, false},
	}

	for _, tt := range tests {
		if got := PermissionGrants(tt.granted, tt.required); got != tt.want {
			t.Errorf("PermissionGrants(%q, %q) = %v, want %v", tt.granted, tt.required, got, tt.want)
		}
	}
}
