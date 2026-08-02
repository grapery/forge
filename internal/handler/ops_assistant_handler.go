package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/grapestree/fgrapery/forge/internal/auth"
	"github.com/grapestree/fgrapery/forge/internal/opsagent"
	"go.uber.org/zap"
)

type OpsAssistantHandler struct {
	reg    *opsagent.Registry
	llm    opsagent.LLMConfig
	logger *zap.Logger
}

func NewOpsAssistantHandler(reg *opsagent.Registry, llm opsagent.LLMConfig, logger *zap.Logger) *OpsAssistantHandler {
	return &OpsAssistantHandler{reg: reg, llm: llm, logger: logger}
}

type opsChatRequest struct {
	Message string                    `json:"message" binding:"required"`
	History []opsagent.HistoryMessage `json:"history,omitempty"`
}

func (h *OpsAssistantHandler) callerFrom(c *gin.Context) opsagent.Caller {
	ac := auth.GetAdminContext(c)
	if ac == nil {
		return opsagent.Caller{}
	}
	return opsagent.Caller{Role: ac.Role, Permissions: ac.Permissions}
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

func (h *OpsAssistantHandler) Chat(c *gin.Context) {
	var req opsChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, CodeInvalidParams, "message required")
		return
	}

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("X-Accel-Buffering", "no")
	c.Writer.Flush()

	write := func(event string, payload any) {
		b, _ := json.Marshal(payload)
		fmt.Fprintf(c.Writer, "event: %s\ndata: %s\n\n", event, string(b))
		if f, ok := c.Writer.(http.Flusher); ok {
			f.Flush()
		}
	}

	caller := h.callerFrom(c)
	history := opsagent.ToChatHistory(req.History)
	if err := opsagent.RunChat(c.Request.Context(), h.llm, h.reg, caller, req.Message, history, write); err != nil {
		h.logger.Warn("ops assistant chat failed", zap.Error(err))
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
