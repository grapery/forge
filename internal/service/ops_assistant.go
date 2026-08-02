package service

import (
	"encoding/json"
	"strings"
	"unicode/utf8"

	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/repository/mysql"
	"go.uber.org/zap"
)

type OpsAssistantService struct {
	repo   *mysql.Repository
	logger *zap.Logger
}

func NewOpsAssistantService(repo *mysql.Repository, logger *zap.Logger) *OpsAssistantService {
	return &OpsAssistantService{repo: repo, logger: logger}
}

func (s *OpsAssistantService) ListSessions(adminID string, page, pageSize int) ([]*domain.OpsAssistantSession, int64, error) {
	return s.repo.ListOpsSessions(&domain.OpsAssistantSessionQuery{
		AdminID:  adminID,
		Page:     page,
		PageSize: pageSize,
	})
}

func (s *OpsAssistantService) GetSessionDetail(adminID, sessionID string) (*domain.OpsAssistantSessionDetail, error) {
	sess, err := s.repo.GetOpsSession(sessionID, adminID)
	if err != nil {
		return nil, err
	}
	if sess == nil || sess.Status == "archived" {
		return nil, nil
	}
	msgs, err := s.repo.ListOpsMessages(sessionID, adminID)
	if err != nil {
		return nil, err
	}
	return &domain.OpsAssistantSessionDetail{Session: sess, Messages: msgs}, nil
}

func (s *OpsAssistantService) CreateSession(adminID, title, provider, model string) (*domain.OpsAssistantSession, error) {
	now := NowFunc()
	title = truncateRunes(strings.TrimSpace(title), 80)
	if title == "" {
		title = "New analysis"
	}
	sess := &domain.OpsAssistantSession{
		ID:        newUUID(),
		AdminID:   adminID,
		Title:     title,
		Status:    "active",
		Provider:  provider,
		Model:     model,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := s.repo.CreateOpsSession(sess); err != nil {
		return nil, err
	}
	return sess, nil
}

func (s *OpsAssistantService) RenameSession(adminID, sessionID, title string) (*domain.OpsAssistantSession, error) {
	sess, err := s.repo.GetOpsSession(sessionID, adminID)
	if err != nil {
		return nil, err
	}
	if sess == nil || sess.Status == "archived" {
		return nil, nil
	}
	title = truncateRunes(strings.TrimSpace(title), 80)
	if title == "" {
		return sess, nil
	}
	sess.Title = title
	sess.UpdatedAt = NowFunc()
	if err := s.repo.UpdateOpsSession(sess); err != nil {
		return nil, err
	}
	return sess, nil
}

func (s *OpsAssistantService) ArchiveSession(adminID, sessionID string) error {
	err := s.repo.ArchiveOpsSession(sessionID, adminID, NowFunc())
	if err != nil {
		return err
	}
	return nil
}

func (s *OpsAssistantService) EnsureSession(adminID, sessionID, firstMessage, provider, model string) (*domain.OpsAssistantSession, error) {
	if sessionID != "" {
		sess, err := s.repo.GetOpsSession(sessionID, adminID)
		if err != nil {
			return nil, err
		}
		if sess == nil || sess.Status == "archived" {
			return nil, nil
		}
		return sess, nil
	}
	return s.CreateSession(adminID, firstMessage, provider, model)
}

func (s *OpsAssistantService) AppendUserMessage(adminID, sessionID, content string) (*domain.OpsAssistantMessage, error) {
	seq, err := s.repo.NextOpsMessageSeq(sessionID)
	if err != nil {
		return nil, err
	}
	now := NowFunc()
	msg := &domain.OpsAssistantMessage{
		ID:        newUUID(),
		SessionID: sessionID,
		AdminID:   adminID,
		Role:      "user",
		Content:   content,
		Seq:       seq,
		CreatedAt: now,
	}
	if err := s.repo.CreateOpsMessage(msg); err != nil {
		return nil, err
	}
	_ = s.touchSession(adminID, sessionID, now, "", "")
	return msg, nil
}

type PersistedToolCall struct {
	Name     string
	Input    string
	Output   string
	Error    string
	Citation any
}

func (s *OpsAssistantService) AppendAssistantTurn(adminID, sessionID, content, provider, model string, tools []PersistedToolCall) (*domain.OpsAssistantMessage, error) {
	seq, err := s.repo.NextOpsMessageSeq(sessionID)
	if err != nil {
		return nil, err
	}
	now := NowFunc()
	msg := &domain.OpsAssistantMessage{
		ID:        newUUID(),
		SessionID: sessionID,
		AdminID:   adminID,
		Role:      "assistant",
		Content:   content,
		Seq:       seq,
		CreatedAt: now,
	}
	if err := s.repo.CreateOpsMessage(msg); err != nil {
		return nil, err
	}

	if len(tools) > 0 {
		calls := make([]domain.OpsAssistantToolCall, 0, len(tools))
		for _, t := range tools {
			cite := ""
			if t.Citation != nil {
				if b, err := json.Marshal(t.Citation); err == nil {
					cite = string(b)
				}
			}
			calls = append(calls, domain.OpsAssistantToolCall{
				ID:           newUUID(),
				MessageID:    msg.ID,
				SessionID:    sessionID,
				Name:         t.Name,
				InputJSON:    t.Input,
				OutputJSON:   t.Output,
				Error:        t.Error,
				CitationJSON: cite,
				CreatedAt:    now,
			})
		}
		if err := s.repo.CreateOpsToolCalls(calls); err != nil {
			s.logger.Warn("failed to persist ops tool calls", zap.Error(err))
		} else {
			msg.Tools = calls
		}
	}

	_ = s.touchSession(adminID, sessionID, now, provider, model)
	return msg, nil
}

func (s *OpsAssistantService) ListMessages(adminID, sessionID string) ([]domain.OpsAssistantMessage, error) {
	return s.repo.ListOpsMessages(sessionID, adminID)
}

func (s *OpsAssistantService) touchSession(adminID, sessionID string, updatedAt int64, provider, model string) error {
	sess, err := s.repo.GetOpsSession(sessionID, adminID)
	if err != nil || sess == nil {
		return err
	}
	sess.UpdatedAt = updatedAt
	if provider != "" {
		sess.Provider = provider
	}
	if model != "" {
		sess.Model = model
	}
	return s.repo.UpdateOpsSession(sess)
}

func truncateRunes(s string, max int) string {
	if max <= 0 || utf8.RuneCountInString(s) <= max {
		return s
	}
	runes := []rune(s)
	return string(runes[:max])
}
