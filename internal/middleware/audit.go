package middleware

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/grapestree/fgrapery/forge/internal/auth"
	"github.com/grapestree/fgrapery/forge/internal/domain"
	"github.com/grapestree/fgrapery/forge/internal/service"
)

// AuditMiddleware automatically logs write operations (POST/PUT/DELETE/PATCH)
// with before/after snapshots. It reads the request body, forwards it to the handler,
// and then captures the response data for the audit log.
func AuditMiddleware(auditSvc *service.AuditLogService) gin.HandlerFunc {
	return func(c *gin.Context) {
		method := c.Request.Method
		if method != http.MethodPost && method != http.MethodPut && method != http.MethodDelete && method != http.MethodPatch {
			c.Next()
			return
		}

		// Skip noisy / non-mutating ops-assistant chat & tool calls
		path := c.Request.URL.Path
		if strings.Contains(path, "/ops-assistant/chat") || strings.Contains(path, "/ops-assistant/tools/") {
			c.Next()
			return
		}

		ctx := auth.GetAdminContext(c)
		if ctx == nil {
			c.Next()
			return
		}

		// Capture request body for before/after snapshots
		var bodyBytes []byte
		if c.Request.Body != nil {
			bodyBytes, _ = io.ReadAll(c.Request.Body)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
		}

		// Determine action from method, then preserve a domain action when the
		// request is an explicit moderation command.
		action := methodToAction(method)
		resource := extractResource(c)
		parts := splitPath(path)
		if resource == "content" {
			for i, part := range parts {
				if part == "content" && i+1 < len(parts) {
					resource = parts[i+1]
					break
				}
			}
			var payload struct {
				Action string `json:"action"`
			}
			if json.Unmarshal(bodyBytes, &payload) == nil && payload.Action != "" {
				action = "moderate_" + payload.Action
			}
		} else if resource == "reports" && containsPathSequence(parts, "reports", "content") && strings.HasSuffix(path, "/resolve") {
			resource = "content_report"
			action = "resolve"
		}

		c.Next()
		statusCode := c.Writer.Status()
		outcome := "succeeded"
		if statusCode == http.StatusForbidden || statusCode == http.StatusUnauthorized {
			outcome = "rejected"
		} else if statusCode >= http.StatusBadRequest {
			outcome = "failed"
		}

		// After handler completes, log the operation
		entry := &domain.AdminOperationLog{
			AdminID:    ctx.AdminID,
			AdminName:  ctx.Username,
			Action:     action,
			Resource:   resource,
			ResourceID: c.Param("id"),
			IP:         clientIP(c),
			UserAgent:  c.Request.UserAgent(),
			Outcome:    outcome,
			StatusCode: statusCode,
		}

		// Store request body as after value (the mutation payload)
		if len(bodyBytes) > 0 {
			var buf bytes.Buffer
			if json.Compact(&buf, bodyBytes) == nil {
				entry.AfterValue = buf.String()
			} else {
				entry.AfterValue = string(bodyBytes)
			}
		}

		auditSvc.Log(entry)
	}
}

func containsPathSequence(parts []string, first, second string) bool {
	for i := 0; i+1 < len(parts); i++ {
		if parts[i] == first && parts[i+1] == second {
			return true
		}
	}
	return false
}

func methodToAction(method string) string {
	switch method {
	case http.MethodPost:
		return "create"
	case http.MethodPut, http.MethodPatch:
		return "update"
	case http.MethodDelete:
		return "delete"
	default:
		return method
	}
}

func extractResource(c *gin.Context) string {
	// Path pattern: /forge/api/admin/<resource>/... or /api/admin/<resource>/...
	path := c.Request.URL.Path
	parts := splitPath(path)
	for i, p := range parts {
		if p == "admin" && i+1 < len(parts) {
			return parts[i+1]
		}
	}
	if len(parts) >= 3 {
		return parts[2]
	}
	return path
}

func splitPath(p string) []string {
	var result []string
	for _, s := range split(p, '/') {
		if s != "" {
			result = append(result, s)
		}
	}
	return result
}

func split(s string, sep byte) []string {
	var result []string
	start := 0
	for i := 0; i < len(s); i++ {
		if s[i] == sep {
			result = append(result, s[start:i])
			start = i + 1
		}
	}
	result = append(result, s[start:])
	return result
}

func clientIP(c *gin.Context) string {
	return c.ClientIP()
}
