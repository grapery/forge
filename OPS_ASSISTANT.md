# Forge Ops Assistant

Read-only ops analyst for Forge admins.

## HTTP (in-app)

- `GET /forge/api/admin/ops-assistant/status`
- `GET /forge/api/admin/ops-assistant/tools`
- `POST /forge/api/admin/ops-assistant/chat` (SSE: `start` / `tool` / `message` / `error` / `done`)
- `POST /forge/api/admin/ops-assistant/tools/:name`

UI: `/forge/ops-assistant`

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

Tools: `get_dashboard_overview`, `get_ai_task_summary`, `get_ai_generation_summary`,
`get_moderation_summary`, `get_orders_membership_summary`, `get_token_summary`,
`get_recent_audit`, `get_search_trends`.
