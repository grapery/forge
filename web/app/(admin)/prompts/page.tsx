"use client"

import { useEffect, useState, useCallback } from "react"
import { promptApi } from "@/lib/api/admin"
import type { PromptAuditRecord, PromptAuditSummary } from "@/lib/types"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { StatCard } from "@/components/shared/stat-card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Cpu, Zap } from "lucide-react"
import { useRouter } from "next/navigation"

export default function PromptsPage() {
  const router = useRouter()
  const [items, setItems] = useState<PromptAuditRecord[]>([])
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState<PromptAuditSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [provider, setProvider] = useState("")
  const [promptKind, setPromptKind] = useState("")
  const pageSize = 20

  const fetchData = useCallback(() => {
    setLoading(true)
    promptApi
      .list({ page, pageSize, provider: provider || undefined, promptKind: promptKind || undefined })
      .then((data) => {
        setItems(data.items || [])
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, provider, promptKind])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    promptApi.summary().then(setSummary).catch(() => {})
  }, [])

  const formatTime = (ts: number) => new Date(ts * 1000).toLocaleString()

  return (
    <div className="space-y-6">
      <PageHeader title="Prompt Audit" description="Review AI prompt usage and audit records" />

      {summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard title="Total Records" value={summary.totalRecords} icon={FileText} />
          <StatCard title="Total Tokens" value={summary.totalTokens.toLocaleString()} icon={Zap} />
          <StatCard title="Providers" value={summary.topProviders.length} icon={Cpu} />
        </div>
      )}

      <div className="flex items-center gap-4">
        <Select value={provider || "all"} onValueChange={(v) => { setProvider(v === "all" ? "" : v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Providers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Providers</SelectItem>
            <SelectItem value="gemini">Gemini</SelectItem>
            <SelectItem value="huoshan">Huoshan</SelectItem>
            <SelectItem value="qwen">Qwen</SelectItem>
            <SelectItem value="kling">Kling</SelectItem>
            <SelectItem value="hailuo">Hailuo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={promptKind || "all"} onValueChange={(v) => { setPromptKind(v === "all" ? "" : v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Kinds" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Kinds</SelectItem>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="image">Image</SelectItem>
            <SelectItem value="video">Video</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading...</div>
      ) : (
        <DataTable
          data={items}
          pagination={{ page, pageSize, total }}
          onPageChange={setPage}
          onRowClick={(r) => router.push(`/prompts/detail?id=${r.id}`)}
          columns={[
            {
              key: "provider",
              header: "Provider",
              render: (r: PromptAuditRecord) => <span className="font-medium">{r.provider}</span>,
            },
            {
              key: "model",
              header: "Model",
              render: (r: PromptAuditRecord) => <span className="text-sm">{r.model}</span>,
            },
            {
              key: "step",
              header: "Step",
              render: (r: PromptAuditRecord) => <span className="text-xs text-muted-foreground">{r.step}</span>,
            },
            {
              key: "tokens",
              header: "Tokens",
              render: (r: PromptAuditRecord) => (
                <span className="text-xs text-muted-foreground">
                  {r.inputTokens} in / {r.outputTokens} out
                </span>
              ),
            },
            {
              key: "entity",
              header: "Entity",
              render: (r: PromptAuditRecord) => (
                <span className="text-xs text-muted-foreground">{r.relatedEntityType}</span>
              ),
            },
            {
              key: "time",
              header: "Time",
              render: (r: PromptAuditRecord) => <span className="text-xs text-muted-foreground">{formatTime(r.createdAt)}</span>,
            },
          ]}
        />
      )}
    </div>
  )
}
