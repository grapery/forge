package main

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/grapestree/fgrapery/forge/internal/config"
	"github.com/grapestree/fgrapery/forge/internal/opsagent"
	"github.com/grapestree/fgrapery/forge/internal/repository/mysql"
	"github.com/grapestree/fgrapery/forge/internal/service"
	"go.uber.org/zap"
)

// Minimal MCP stdio server exposing Forge ops tools (shared with Ops Assistant).
func main() {
	cfg := config.Load()
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	mainDB, err := mysql.InitDB(cfg.Database, logger)
	if err != nil {
		fatal(err)
	}
	forgeDB, err := mysql.InitDB(cfg.ForgeDB, logger)
	if err != nil {
		fatal(err)
	}
	repo := mysql.NewRepository(forgeDB, logger)
	readRepo := mysql.NewReadRepository(mainDB)
	writeRepo := mysql.NewWriteRepository(mainDB)

	contentSvc := service.NewContentService(readRepo, writeRepo)
	commentSvc := service.NewCommentService(readRepo, writeRepo, logger)
	characterSvc := service.NewCharacterService(readRepo, writeRepo)
	reg := opsagent.NewRegistry(opsagent.Deps{
		Dashboard: service.NewDashboardService(readRepo, repo, logger),
		AITask:    service.NewAITaskService(readRepo, writeRepo),
		AIGen:     service.NewAIGenerationService(readRepo),
		Report:    service.NewReportService(readRepo, writeRepo, contentSvc, commentSvc, characterSvc, logger),
		Order:     service.NewOrderService(readRepo, writeRepo, logger),
		Member:    service.NewMembershipService(mainDB, readRepo, writeRepo, logger),
		Token:     service.NewTokenService(readRepo, logger),
		Audit:     service.NewAuditLogService(repo, logger),
		Search:    service.NewSearchAnalyticsService(readRepo),
		Feedback:  service.NewFeedbackService(readRepo, writeRepo, logger),
		Share:     service.NewShareAnalyticsService(readRepo),
		Agent:     service.NewAgentService(readRepo, writeRepo),
		User:      service.NewUserService(readRepo, writeRepo),
		Content:   contentSvc,
	})

	br := bufio.NewReader(os.Stdin)
	for {
		line, err := br.ReadBytes('\n')
		if err != nil {
			return
		}
		var req mcpRequest
		if err := json.Unmarshal(line, &req); err != nil {
			write(mcpError(req.ID, -32700, "parse error"))
			continue
		}
		switch req.Method {
		case "initialize":
			write(mcpResult(req.ID, map[string]any{
				"protocolVersion": "2024-11-05",
				"capabilities": map[string]any{
					"tools":     map[string]any{},
					"resources": map[string]any{},
					"prompts":   map[string]any{},
				},
				"serverInfo": map[string]any{"name": "forge-ops", "version": "1.1.0"},
			}))
		case "notifications/initialized":
			continue
		case "tools/list":
			tools := make([]map[string]any, 0)
			for _, t := range reg.List() {
				var schema any
				_ = json.Unmarshal(t.Parameters, &schema)
				tools = append(tools, map[string]any{
					"name":        t.Name,
					"description": t.Description,
					"inputSchema": schema,
				})
			}
			write(mcpResult(req.ID, map[string]any{"tools": tools}))
		case "tools/call":
			var params struct {
				Name      string          `json:"name"`
				Arguments json.RawMessage `json:"arguments"`
			}
			_ = json.Unmarshal(req.Params, &params)
			args := "{}"
			if len(params.Arguments) > 0 {
				args = string(params.Arguments)
			}
			res := reg.Call(context.Background(), params.Name, args)
			content := res.Output
			isErr := res.Error != ""
			if isErr {
				content = res.Error
			}
			write(mcpResult(req.ID, map[string]any{
				"content": []map[string]any{{"type": "text", "text": content}},
				"isError": isErr,
			}))
		case "resources/list":
			resources := make([]map[string]any, 0)
			for _, s := range opsagent.ListAnalysisSkills() {
				resources = append(resources, map[string]any{
					"uri":         "opsagent://skill/" + s.ID,
					"name":        s.Title,
					"description": s.Process,
					"mimeType":    "application/json",
				})
			}
			write(mcpResult(req.ID, map[string]any{"resources": resources}))
		case "resources/read":
			var params struct {
				URI string `json:"uri"`
			}
			_ = json.Unmarshal(req.Params, &params)
			id := strings.TrimPrefix(params.URI, "opsagent://skill/")
			s := opsagent.GetAnalysisSkill(id)
			if s == nil {
				write(mcpError(req.ID, -32002, "resource not found"))
				continue
			}
			b, _ := json.Marshal(s)
			write(mcpResult(req.ID, map[string]any{
				"contents": []map[string]any{{
					"uri":      params.URI,
					"mimeType": "application/json",
					"text":     string(b),
				}},
			}))
		case "prompts/list":
			prompts := make([]map[string]any, 0)
			for _, s := range opsagent.ListAnalysisSkills() {
				prompts = append(prompts, map[string]any{
					"name":        "skill_" + s.ID,
					"description": s.Title + " — " + s.Process,
				})
			}
			write(mcpResult(req.ID, map[string]any{"prompts": prompts}))
		case "prompts/get":
			var params struct {
				Name string `json:"name"`
			}
			_ = json.Unmarshal(req.Params, &params)
			id := strings.TrimPrefix(params.Name, "skill_")
			s := opsagent.GetAnalysisSkill(id)
			if s == nil {
				write(mcpError(req.ID, -32002, "prompt not found"))
				continue
			}
			write(mcpResult(req.ID, map[string]any{
				"description": s.Title,
				"messages": []map[string]any{{
					"role": "user",
					"content": map[string]any{
						"type": "text",
						"text": s.ChipPrompt + "\n\n" + s.HowToAnalyze,
					},
				}},
			}))
		case "ping":
			write(mcpResult(req.ID, map[string]any{}))
		default:
			write(mcpError(req.ID, -32601, "method not found: "+req.Method))
		}
	}
}

type mcpRequest struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      any             `json:"id"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params"`
}

func mcpResult(id any, result any) map[string]any {
	return map[string]any{"jsonrpc": "2.0", "id": id, "result": result}
}

func mcpError(id any, code int, msg string) map[string]any {
	return map[string]any{"jsonrpc": "2.0", "id": id, "error": map[string]any{"code": code, "message": msg}}
}

func write(v any) {
	b, _ := json.Marshal(v)
	fmt.Println(string(b))
}

func fatal(err error) {
	fmt.Fprintln(os.Stderr, err)
	os.Exit(1)
}
