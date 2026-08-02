"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { opsAssistantApi, type OpsAssistantStatus } from "@/lib/api/admin"
import { Sparkles, Send, Wrench, ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

type Citation = {
  tool?: string
  highlights?: Record<string, unknown>
}

type ToolTrace = {
  name: string
  input?: string
  output?: string
  error?: string
  citation?: Citation
}

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  tools?: ToolTrace[]
  pending?: boolean
}

const FORGE_API_URL = process.env.NEXT_PUBLIC_FORGE_API_URL || "/forge"

async function streamChat(
  message: string,
  history: { role: string; content: string }[],
  onEvent: (event: string, data: any) => void,
  signal?: AbortSignal,
) {
  const token = localStorage.getItem("forge_access_token")
  const res = await fetch(`${FORGE_API_URL}/api/admin/ops-assistant/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, history }),
    signal,
  })
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "")
    throw new Error(text || `HTTP ${res.status}`)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split("\n\n")
    buffer = parts.pop() || ""
    for (const part of parts) {
      const lines = part.split("\n")
      let event = "message"
      let data = ""
      for (const line of lines) {
        if (line.startsWith("event:")) event = line.slice(6).trim()
        if (line.startsWith("data:")) data += line.slice(5).trim()
      }
      if (!data) continue
      try {
        onEvent(event, JSON.parse(data))
      } catch {
        onEvent(event, { raw: data })
      }
    }
  }
}

function CitationCards({ tools }: { tools: ToolTrace[] }) {
  const t = useTranslations("opsAssistant")
  const cards = tools
    .map((tool) => tool.citation)
    .filter((c): c is Citation => !!c?.highlights && Object.keys(c.highlights).length > 0)
  if (!cards.length) return null
  return (
    <div className="mt-2 space-y-2">
      <p className="text-[11px] text-muted-foreground">{t("citations")}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {cards.map((cite, i) => (
          <div key={`${cite.tool}-${i}`} className="rounded-md border border-border bg-background px-3 py-2">
            <p className="text-[11px] text-muted-foreground mb-1">{cite.tool}</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {Object.entries(cite.highlights || {}).slice(0, 6).map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <p className="text-[10px] text-muted-foreground truncate">{k}</p>
                  <p className="text-sm font-medium tabular-nums truncate">{String(v)}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ToolTraceBlock({ tools }: { tools: ToolTrace[] }) {
  const t = useTranslations("opsAssistant")
  const [open, setOpen] = useState(false)
  if (!tools.length) return null
  return (
    <div className="mt-2 rounded-md border border-border bg-secondary/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        <Wrench className="h-3.5 w-3.5" />
        {t("toolCall")} · {tools.length}
      </button>
      {open && (
        <div className="space-y-2 border-t border-border px-3 py-2">
          {tools.map((tool, i) => (
            <div key={`${tool.name}-${i}`} className="text-xs">
              <p className="font-medium text-foreground">{tool.name}</p>
              {tool.error && <p className="text-[var(--status-danger)] mt-0.5">{tool.error}</p>}
              {tool.output && (
                <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-background border border-border p-2 text-[11px] text-muted-foreground">
                  {tool.output.slice(0, 2000)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function OpsAssistantPage() {
  const t = useTranslations("opsAssistant")
  const [status, setStatus] = useState<OpsAssistantStatus | null>(null)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    opsAssistantApi.status().then(setStatus).catch(() => setStatus(null))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const send = useCallback(async (text: string) => {
    const message = text.trim()
    if (!message || sending) return
    setInput("")
    setSending(true)

    const history = messages
      .filter((m) => !m.pending && m.content)
      .map((m) => ({ role: m.role, content: m.content }))

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: message }
    const assistantId = `a-${Date.now()}`
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "", tools: [], pending: true },
    ])

    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    try {
      await streamChat(
        message,
        history,
        (event, data) => {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== assistantId) return m
              if (event === "tool") {
                return {
                  ...m,
                  tools: [
                    ...(m.tools || []),
                    {
                      name: data.name,
                      input: data.input,
                      output: data.output,
                      error: data.error,
                      citation: data.citation,
                    },
                  ],
                }
              }
              if (event === "message" || event === "done") {
                return {
                  ...m,
                  content: data.message || m.content,
                  pending: event !== "done",
                }
              }
              if (event === "error") {
                return {
                  ...m,
                  content: data.error || t("error"),
                  pending: false,
                }
              }
              return m
            }),
          )
        },
        ac.signal,
      )
    } catch (err: any) {
      if (err?.name === "AbortError") return
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: err?.message || t("error"), pending: false }
            : m,
        ),
      )
    } finally {
      setSending(false)
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, pending: false } : m)))
    }
  }, [sending, t, messages])

  const chips = [t("chipGrowth"), t("chipAi"), t("chipModeration"), t("chipRevenue")]

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Sparkles}
        actions={
          status ? (
            <div className="flex flex-col items-end gap-1">
              <span
                className={cn(
                  "text-xs rounded-md border px-2 py-1",
                  status.configured
                    ? "border-border text-muted-foreground"
                    : "border-[var(--status-warning)]/30 text-[var(--status-warning)] bg-[var(--status-warning-bg)]",
                )}
              >
                {status.configured
                  ? t("statusConfigured", { provider: status.provider, model: status.model, tools: status.tools })
                  : t("notConfigured")}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {status.mcp ? t("statusMcpOn") : t("statusMcpOff")}
              </span>
            </div>
          ) : null
        }
      />

      <Card className="flex-1 flex flex-col min-h-[420px]">
        <CardContent className="flex flex-col flex-1 p-0">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="py-10 text-center">
                <p className="text-sm text-muted-foreground mb-4">{t("emptyHint")}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {chips.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => send(chip)}
                      className="rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs text-foreground hover:bg-secondary transition-colors"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm whitespace-pre-wrap",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground",
                  )}
                >
                  {m.pending && !m.content ? (
                    <span className="text-muted-foreground">{t("thinking")}</span>
                  ) : (
                    m.content
                  )}
                  {m.role === "assistant" && m.tools && (
                    <>
                      <CitationCards tools={m.tools} />
                      <ToolTraceBlock tools={m.tools} />
                    </>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-border p-3">
            <div className="flex gap-2 items-end">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("placeholder")}
                rows={2}
                className="min-h-[44px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    send(input)
                  }
                }}
              />
              <Button size="icon" onClick={() => send(input)} disabled={sending || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
