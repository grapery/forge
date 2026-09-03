package mysql

import (
	"errors"
	"strings"
	"time"

	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/google/uuid"
)

func workflowTestRunToDB(run *domain.WorkflowTestRun) *WorkflowTestRun {
	return &WorkflowTestRun{
		ID:          run.ID,
		WorkflowKey: run.WorkflowKey,
		ReleaseID:   run.ReleaseID,
		Version:     run.Version,
		Surface:     run.Surface,
		Action:      run.Action,
		Input:       run.Input,
		RunID:       run.RunID,
		Status:      run.Status,
		Error:       run.Error,
		Output:      run.Output,
		TokensUsed:  run.TokensUsed,
		TriggeredBy: run.TriggeredBy,
		CreatedAt:   run.CreatedAt,
		UpdatedAt:   run.UpdatedAt,
	}
}

func workflowTestRunFromDB(db *WorkflowTestRun) *domain.WorkflowTestRun {
	return &domain.WorkflowTestRun{
		ID:          db.ID,
		WorkflowKey: db.WorkflowKey,
		ReleaseID:   db.ReleaseID,
		Version:     db.Version,
		Surface:     db.Surface,
		Action:      db.Action,
		Input:       db.Input,
		RunID:       db.RunID,
		Status:      db.Status,
		Error:       db.Error,
		Output:      db.Output,
		TokensUsed:  db.TokensUsed,
		TriggeredBy: db.TriggeredBy,
		CreatedAt:   db.CreatedAt,
		UpdatedAt:   db.UpdatedAt,
	}
}

func (r *Repository) CreateWorkflowTestRun(run *domain.WorkflowTestRun) error {
	if run.ID == "" {
		run.ID = "wtr_" + uuid.NewString()
	}
	if run.CreatedAt.IsZero() {
		run.CreatedAt = time.Now()
		run.UpdatedAt = run.CreatedAt
	}
	return r.db.Create(workflowTestRunToDB(run)).Error
}

func (r *Repository) GetWorkflowTestRunByRunID(runID string) (*domain.WorkflowTestRun, error) {
	var dbRun WorkflowTestRun
	if err := r.db.Where("run_id = ?", strings.TrimSpace(runID)).First(&dbRun).Error; err != nil {
		return nil, err
	}
	return workflowTestRunFromDB(&dbRun), nil
}

func (r *Repository) SaveWorkflowTestRun(run *domain.WorkflowTestRun) error {
	if strings.TrimSpace(run.ID) == "" {
		return errors.New("workflow test run id is required")
	}
	return r.db.Save(workflowTestRunToDB(run)).Error
}

func (r *Repository) ListWorkflowTestRuns(releaseID string, limit int) ([]*domain.WorkflowTestRun, error) {
	if limit <= 0 || limit > 50 {
		limit = 10
	}
	var dbRuns []*WorkflowTestRun
	if err := r.db.Where("release_id = ?", strings.TrimSpace(releaseID)).
		Order("created_at DESC").Limit(limit).Find(&dbRuns).Error; err != nil {
		return nil, err
	}
	items := make([]*domain.WorkflowTestRun, 0, len(dbRuns))
	for _, dbRun := range dbRuns {
		items = append(items, workflowTestRunFromDB(dbRun))
	}
	return items, nil
}
