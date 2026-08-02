# Forge Ops Assistant

Read-only ops analyst for Forge admins.

## HTTP (in-app)

- `GET /forge/api/admin/ops-assistant/status`
- `GET /forge/api/admin/ops-assistant/tools`
- `POST /forge/api/admin/ops-assistant/chat` (SSE: `start` / `tool` / `message` / `error` / `done`)
- `POST /forge/api/admin/ops-assistant/tools/:name`

UI: `/forge/ops-assistant`

## LLM env

```
FORGE_OPS_PROVIDER=huoshan   # or gemini
FORGE_OPS_API_KEY=...        # falls back to HUOSHAN_API_KEY / GEMINI_API_KEY
FORGE_OPS_BASE_URL=...       # optional; huoshan default Ark URL
FORGE_OPS_MODEL=...
FORGE_OPS_MAX_ITERATIONS=8
FORGE_OPS_MCP_ENABLED=true   # surfaces mcp:true in /status (stdio MCP is separate process)
FORGE_HTTP_WRITE_TIMEOUT=180s
```

Permissions: `super_admin`/`admin` see all tools. `operator`/`viewer` only see tools matching their `permissions` (and dashboard overview fields are redacted).

## MCP (shared tools)

```bash
cd forge && go run ./cmd/ops-mcp
```

See `ops-mcp.cursor.example.json` for Cursor MCP wiring.

Tools: `get_dashboard_overview`, `get_ai_task_summary`, `get_ai_generation_summary`,
`get_moderation_summary`, `get_orders_membership_summary`, `get_token_summary`,
`get_recent_audit`, `get_search_trends`.
