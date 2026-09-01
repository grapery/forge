package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/grapestree/fgrapery/forge/internal/config"
	"github.com/grapestree/fgrapery/forge/internal/domain"
)

type WorkflowPublisher interface {
	PublishPromptVersion(ctx context.Context, prompt *domain.PromptTemplateVersion) (*domain.PromptTemplateVersion, error)
	PublishRelease(ctx context.Context, release *domain.WorkflowRelease) (*domain.WorkflowRelease, error)
	SaveBinding(ctx context.Context, binding *domain.WorkflowBinding) (*domain.WorkflowBinding, error)
	ListCatalog(ctx context.Context, surface, action, tenantID string) ([]domain.WorkflowCatalogEntry, error)
	ReleaseStats(ctx context.Context, days int) ([]domain.WorkflowReleaseStats, error)
}

func (p *GraperyWorkflowPublisher) PublishPromptVersion(ctx context.Context, prompt *domain.PromptTemplateVersion) (*domain.PromptTemplateVersion, error) {
	path := "/api/v1/agent-policy/prompt-versions/" + url.PathEscape(prompt.ID)
	var saved domain.PromptTemplateVersion
	if err := p.put(ctx, path, prompt, &saved); err != nil {
		return nil, err
	}
	return &saved, nil
}

type GraperyWorkflowPublisher struct {
	baseURL string
	apiKey  string
	client  *http.Client
}

func NewGraperyWorkflowPublisher(cfg config.WorkflowRuntimeConfig) *GraperyWorkflowPublisher {
	return &GraperyWorkflowPublisher{
		baseURL: strings.TrimRight(cfg.BaseURL, "/"), apiKey: strings.TrimSpace(cfg.InternalAPIKey),
		client: &http.Client{Timeout: 30 * time.Second},
	}
}

func (p *GraperyWorkflowPublisher) PublishRelease(ctx context.Context, release *domain.WorkflowRelease) (*domain.WorkflowRelease, error) {
	path := "/api/v1/agent-policy/workflow-releases/" + url.PathEscape(release.ID)
	var saved domain.WorkflowRelease
	if err := p.put(ctx, path, release, &saved); err != nil {
		return nil, err
	}
	return &saved, nil
}

func (p *GraperyWorkflowPublisher) SaveBinding(ctx context.Context, binding *domain.WorkflowBinding) (*domain.WorkflowBinding, error) {
	path := "/api/v1/agent-policy/workflow-bindings/" + url.PathEscape(binding.ID)
	var saved domain.WorkflowBinding
	if err := p.put(ctx, path, binding, &saved); err != nil {
		return nil, err
	}
	return &saved, nil
}

func (p *GraperyWorkflowPublisher) ListCatalog(ctx context.Context, surface, action, tenantID string) ([]domain.WorkflowCatalogEntry, error) {
	query := url.Values{}
	query.Set("surface", strings.TrimSpace(surface))
	query.Set("action", strings.TrimSpace(action))
	if tenantID = strings.TrimSpace(tenantID); tenantID != "" {
		query.Set("tenantId", tenantID)
	}
	var result struct {
		Items []domain.WorkflowCatalogEntry `json:"items"`
	}
	if err := p.get(ctx, "/api/v1/agent-policy/workflow-catalog?"+query.Encode(), &result); err != nil {
		return nil, err
	}
	return result.Items, nil
}

func (p *GraperyWorkflowPublisher) ReleaseStats(ctx context.Context, days int) ([]domain.WorkflowReleaseStats, error) {
	if days <= 0 {
		days = 30
	}
	var result struct {
		Items []domain.WorkflowReleaseStats `json:"items"`
	}
	path := fmt.Sprintf("/api/v1/agent-policy/workflow-stats?days=%d", days)
	if err := p.get(ctx, path, &result); err != nil {
		return nil, err
	}
	return result.Items, nil
}

func (p *GraperyWorkflowPublisher) put(ctx context.Context, path string, body, result any) error {
	return p.request(ctx, http.MethodPut, path, body, result)
}

func (p *GraperyWorkflowPublisher) get(ctx context.Context, path string, result any) error {
	return p.request(ctx, http.MethodGet, path, nil, result)
}

func (p *GraperyWorkflowPublisher) request(ctx context.Context, method, path string, body, result any) error {
	if p.apiKey == "" {
		return fmt.Errorf("GRAPERY_INTERNAL_API_KEY is required for workflow registry access")
	}
	var payload []byte
	var err error
	if body != nil {
		payload, err = json.Marshal(body)
		if err != nil {
			return err
		}
	}
	req, err := http.NewRequestWithContext(ctx, method, p.baseURL+path, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Internal-Api-Key", p.apiKey)
	resp, err := p.client.Do(req)
	if err != nil {
		return fmt.Errorf("publish workflow request: %w", err)
	}
	defer resp.Body.Close()
	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode >= 400 {
		return fmt.Errorf("grapery workflow registry HTTP %d: %s", resp.StatusCode, string(b))
	}
	var envelope struct {
		Code    int             `json:"code"`
		Message string          `json:"message"`
		Data    json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(b, &envelope); err != nil {
		return err
	}
	if envelope.Code != 1 {
		return fmt.Errorf("grapery workflow registry: %s", envelope.Message)
	}
	return json.Unmarshal(envelope.Data, result)
}
