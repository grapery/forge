package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/grapestree/fgrapery/forge/internal/auth"
	"github.com/grapestree/fgrapery/forge/internal/opsagent"
	"github.com/grapestree/fgrapery/forge/internal/service"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type OpsAssistantHandler struct {
	reg    *opsagent.Registry
	llm    opsagent.LLMConfig
	svc    *service.OpsAssistantService
	logger *zap.Logger
}

func NewOpsAssistantHandler(reg *opsagent.Registry, llm opsagent.LLMConfig, svc *service.OpsAssistantService, logger *zap.Logger) *OpsAssistantHandler {
	return &OpsAssistantHandler{reg: reg, llm: llm, svc: svc, logger: logger}
}

type opsChatRequest struct {
	Message   string                    `json:"message" binding:"required"`
	SessionID string                    `json:"sessionId,omitempty"`
	History   []opsagent.HistoryMessage `json:"history,omitempty"`
}

type opsSessionPatchRequest struct {
	Title  string `json:"title"`
	Status string `json:"status"`
}

func (h *OpsAssistantHandler) callerFrom(c *gin.Context) opsagent.Caller {
	ac := auth.GetAdminContext(c)
	if ac == nil {
		return opsagent.Caller{}
	}
	return opsagent.Caller{Role: ac.Role, Permissions: ac.Permissions}
}

func (h *OpsAssistantHandler) adminID(c *gin.Context) string {
	ac := auth.GetAdminContext(c)
	if ac == nil {
		return ""
	}
	return ac.AdminID
}

func (h *OpsAssistantHandler) Status(c *gin.Context) {
	caller := h.callerFrom(c)
	tools := h.reg.ListFor(caller)
	Success(c, gin.H{
		"configured": h.llm.Enabled(),
		"provider":   h.llm.Provider,
		"model":      h.llm.Model,
		"tools":      len(tools),
		"mcp":        os.Getenv("FORGE_OPS_MCP_ENABLED") == "1" || os.Getenv("FORGE_OPS_MCP_ENABLED") == "true",
	})
}

func (h *OpsAssistantHandler) ListTools(c *gin.Context) {
	Success(c, h.reg.ListFor(h.callerFrom(c)))
}

func (h *OpsAssistantHandler) ListSessions(c *gin.Context) {
	adminID := h.adminID(c)
	if adminID == "" {
		Error(c, CodeUnauthorized, "unauthorized")
		return
	}
	page, pageSize := parsePagination(c)
	items, total, err := h.svc.ListSessions(adminID, page, pageSize)
	if err != nil {
		h.logger.Error("list ops sessions failed", zap.Error(err))
		Error(c, CodeInternalError, "failed to list sessions")
		return
	}
	Paginated(c, items, total, page, pageSize)
}

func (h *OpsAssistantHandler) CreateSession(c *gin.Context) {
	adminID := h.adminID(c)
	if adminID == "" {
		Error(c, CodeUnauthorized, "unauthorized")
		return
	}
	var req struct {
		Title string `json:"title"`
	}
	_ = c.ShouldBindJSON(&req)
	sess, err := h.svc.CreateSession(adminID, req.Title, h.llm.Provider, h.llm.Model)
	if err != nil {
		h.logger.Error("create ops session failed", zap.Error(err))
		Error(c, CodeInternalError, "failed to create session")
		return
	}
	Success(c, sess)
}

func (h *OpsAssistantHandler) GetSession(c *gin.Context) {
	adminID := h.adminID(c)
	if adminID == "" {
		Error(c, CodeUnauthorized, "unauthorized")
		return
	}
	detail, err := h.svc.GetSessionDetail(adminID, c.Param("id"))
	if err != nil {
		h.logger.Error("get ops session failed", zap.Error(err))
		Error(c, CodeInternalError, "failed to load session")
		return
	}
	if detail == nil {
		Error(c, CodeNotFound, "session not found")
		return
	}
	Success(c, detail)
}

func (h *OpsAssistantHandler) PatchSession(c *gin.Context) {
	adminID := h.adminID(c)
	if adminID == "" {
		Error(c, CodeUnauthorized, "unauthorized")
		return
	}
	var req opsSessionPatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, CodeInvalidParams, "invalid body")
		return
	}
	id := c.Param("id")
	if strings.TrimSpace(req.Title) != "" {
		sess, err := h.svc.RenameSession(adminID, id, req.Title)
		if err != nil {
			Error(c, CodeInternalError, "failed to update session")
			return
		}
		if sess == nil {
			Error(c, CodeNotFound, "session not found")
			return
		}
		Success(c, sess)
		return
	}
	if req.Status == "archived" {
		if err := h.svc.ArchiveSession(adminID, id); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				Error(c, CodeNotFound, "session not found")
				return
			}
			Error(c, CodeInternalError, "failed to archive session")
			return
		}
		Success(c, gin.H{"id": id, "status": "archived"})
		return
	}
	Error(c, CodeInvalidParams, "title or status=archived required")
}

func (h *OpsAssistantHandler) DeleteSession(c *gin.Context) {
	adminID := h.adminID(c)
	if adminID == "" {
		Error(c, CodeUnauthorized, "unauthorized")
		return
	}
	if err := h.svc.ArchiveSession(adminID, c.Param("id")); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			Error(c, CodeNotFound, "session not found")
			return
		}
		Error(c, CodeInternalError, "failed to delete session")
		return
	}
	Success(c, gin.H{"id": c.Param("id"), "status": "archived"})
}

func (h *OpsAssistantHandler) Chat(c *gin.Context) {
	var req opsChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, CodeInvalidParams, "message required")
		return
	}
	adminID := h.adminID(c)
	if adminID == "" {
		Error(c, CodeUnauthorized, "unauthorized")
		return
	}

	sess, err := h.svc.EnsureSession(adminID, req.SessionID, req.Message, h.llm.Provider, h.llm.Model)
	if err != nil {
		h.logger.Error("ensure ops session failed", zap.Error(err))
		Error(c, CodeInternalError, "failed to prepare session")
		return
	}
	if sess == nil {
		Error(c, CodeNotFound, "session not found")
		return
	}

	history := req.History
	if dbMsgs, err := h.svc.ListMessages(adminID, sess.ID); err == nil && len(dbMsgs) > 0 {
		history = make([]opsagent.HistoryMessage, 0, len(dbMsgs))
		for _, m := range dbMsgs {
			if m.Role != "user" && m.Role != "assistant" {
				continue
			}
			if strings.TrimSpace(m.Content) == "" {
				continue
			}
			history = append(history, opsagent.HistoryMessage{Role: m.Role, Content: m.Content})
		}
	}

	if _, err := h.svc.AppendUserMessage(adminID, sess.ID, req.Message); err != nil {
		h.logger.Warn("persist user message failed", zap.Error(err))
	}

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("X-Accel-Buffering", "no")
	c.Writer.Flush()

	var tools []service.PersistedToolCall
	var finalMsg string

	write := func(event string, payload any) {
		if event == "start" {
			if m, ok := payload.(map[string]any); ok {
				m["sessionId"] = sess.ID
				payload = m
			}
		}
		if event == "tool" {
			if m, ok := payload.(map[string]any); ok {
				tools = append(tools, service.PersistedToolCall{
					Name:     asString(m["name"]),
					Input:    asString(m["input"]),
					Output:   asString(m["output"]),
					Error:    asString(m["error"]),
					Citation: m["citation"],
				})
			}
		}
		if event == "message" || event == "done" {
			if m, ok := payload.(map[string]any); ok {
				if msg := asString(m["message"]); msg != "" {
					finalMsg = msg
				}
			}
		}
		if event == "error" {
			if m, ok := payload.(map[string]any); ok {
				if msg := asString(m["error"]); msg != "" && finalMsg == "" {
					finalMsg = msg
				}
			}
		}
		b, _ := json.Marshal(payload)
		fmt.Fprintf(c.Writer, "event: %s\ndata: %s\n\n", event, string(b))
		if f, ok := c.Writer.(http.Flusher); ok {
			f.Flush()
		}
	}

	caller := h.callerFrom(c)
	chatHistory := opsagent.ToChatHistory(history)
	runErr := opsagent.RunChat(c.Request.Context(), h.llm, h.reg, caller, req.Message, chatHistory, write)
	if runErr != nil {
		h.logger.Warn("ops assistant chat failed", zap.Error(runErr))
	}

	if finalMsg != "" || len(tools) > 0 {
		if _, err := h.svc.AppendAssistantTurn(adminID, sess.ID, finalMsg, h.llm.Provider, h.llm.Model, tools); err != nil {
			h.logger.Warn("persist assistant turn failed", zap.Error(err))
		}
	}
}

// ToolCall allows MCP/HTTP to invoke a single read-only tool.
func (h *OpsAssistantHandler) ToolCall(c *gin.Context) {
	name := c.Param("name")
	body, _ := io.ReadAll(c.Request.Body)
	if len(body) == 0 {
		body = []byte("{}")
	}
	res := h.reg.CallFor(c.Request.Context(), h.callerFrom(c), name, string(body))
	if res.Error != "" {
		code := CodeInvalidParams
		if res.Error == "permission denied" {
			code = CodeForbidden
		}
		Error(c, code, res.Error)
		return
	}
	Success(c, res)
}

func asString(v any) string {
	if v == nil {
		return ""
	}
	switch t := v.(type) {
	case string:
		return t
	default:
		b, err := json.Marshal(t)
		if err != nil {
			return fmt.Sprint(t)
		}
		return string(b)
	}
}
