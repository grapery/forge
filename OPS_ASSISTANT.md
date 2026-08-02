# Forge Ops Assistant

Read-only ops analyst for Forge admins.

## HTTP (in-app)

- `GET /forge/api/admin/ops-assistant/status`
- `GET /forge/api/admin/ops-assistant/tools`
- `GET /forge/api/admin/ops-assistant/skills` — analysis playbooks (process + how-to)
- `GET /forge/api/admin/ops-assistant/skills/:id`
- `GET /forge/api/admin/ops-assistant/sessions` — list current admin’s saved analyses
- `POST /forge/api/admin/ops-assistant/sessions` — create empty session
- `GET /forge/api/admin/ops-assistant/sessions/:id` — session + messages + tool traces
- `PATCH /forge/api/admin/ops-assistant/sessions/:id` — rename / archive
- `DELETE /forge/api/admin/ops-assistant/sessions/:id` — soft-delete (archive)
- `POST /forge/api/admin/ops-assistant/chat` (SSE: `start` / `tool` / `message` / `error` / `done`)
  - Body: `{ message, sessionId?, skillId?, history? }`
  - Persists turns to `forge_ops` (`ops_assistant_sessions` / `_messages` / `_tool_calls`)
  - `start` includes `sessionId` (and `skillId` when set)
- `POST /forge/api/admin/ops-assistant/tools/:name`

UI: `/forge/ops-assistant` — history sidebar, analysis skill chips, copy answer / export Markdown

## Analysis skills

Playbooks in `internal/opsagent/skills.go` (also exposed as MCP tools `list_analysis_skills` / `get_analysis_skill`):

| id | Focus |
|----|--------|
| `growth` | User/content growth health |
| `ai_health` | AI task + generation pipeline |
| `moderation` | Reports + feedback SLA |
| `revenue` | Orders / memberships / tokens |
| `growth_share` | Share funnel |
| `audit_security` | Recent admin actions |

Each skill documents **business process**, **how to analyze**, and **suggested tools**. Selecting a skill in the UI injects the playbook into the system prompt for that turn.

## LLM env

Uses [DeepSeek OpenAI-compatible API](https://api-docs.deepseek.com/zh-cn/quick_start/pricing) by default (`deepseek-v4-flash`, tool calls supported).

```
FORGE_OPS_PROVIDER=deepseek          # deepseek | huoshan | gemini
FORGE_OPS_API_KEY=sk-...             # GitHub Actions Variable (vars), or DEEPSEEK_API_KEY locally
FORGE_OPS_BASE_URL=https://api.deepseek.com   # optional; /v1 also ok
FORGE_OPS_MODEL=deepseek-v4-flash    # or deepseek-v4-pro
FORGE_OPS_THINKING=false             # V4 thinking; default off for simpler tool loops
FORGE_OPS_MAX_ITERATIONS=8
FORGE_OPS_MCP_ENABLED=true           # surfaces mcp:true in /status (stdio MCP is separate process)
FORGE_HTTP_WRITE_TIMEOUT=180s
```

Huoshan / Gemini remain available by switching `FORGE_OPS_PROVIDER`.
Permissions: `super_admin`/`admin` see all tools. `operator`/`viewer` only see tools matching their `permissions` (and dashboard overview fields are redacted).

## MCP (shared tools)

```bash
cd forge && go run ./cmd/ops-mcp
```

See `ops-mcp.cursor.example.json` for Cursor MCP wiring.

Meta tools: `list_analysis_skills`, `get_analysis_skill`

Summary tools: `get_dashboard_overview`, `get_ai_task_summary`, `get_ai_generation_summary`,
`get_moderation_summary`, `get_feedback_summary`, `get_orders_membership_summary`,
`get_token_summary`, `get_user_status_counts`, `get_content_status_counts`,
`get_share_overview`, `get_agent_stats`, `get_recent_audit`, `get_search_trends`.

Triage list tools: `list_failed_ai_tasks`, `list_pending_reports`, `list_overdue_feedback`.

MCP also exposes:
- resources `opsagent://skill/{id}` (JSON playbooks)
- prompts `skill_{id}` (chip + how-to text)
