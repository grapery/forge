"use client"

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"

import { promptApi } from "@/lib/api/admin"

import type { PromptAuditRecord, PromptAuditSummary } from "@/lib/types"

import { PageHeader } from "@/components/shared/page-header"

import { DataTable } from "@/components/shared/data-table"

import { StatCard } from "@/components/shared/stat-card"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { FileText, Cpu, Zap, Terminal } from "lucide-react"

import { useRouter } from "next/navigation"
import { AdminPage } from "@/components/layout/admin-page"


export default function PromptsPage() {
  const router = useRouter()
  const t = useTranslations("prompts")
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
    <AdminPage>
      <PageHeader title={t("title")} description={t("description")} icon={Terminal} />

      {summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard title={t("statTotalRecords")} value={summary.totalRecords} icon={FileText} />
          <StatCard title={t("statTotalTokens")} value={summary.totalTokens.toLocaleString()} icon={Zap} />
          <StatCard title={t("statProviders")} value={summary.topProviders.length} icon={Cpu} />
        </div>
      )}

      <div className="flex items-center gap-4">
        <Select value={provider || "all"} onValueChange={(v) => { setProvider(v === "all" ? "" : v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("filterAllProviders")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAllProviders")}</SelectItem>
            <SelectItem value="gemini">{t("filterGemini")}</SelectItem>
            <SelectItem value="huoshan">{t("filterHuoshan")}</SelectItem>
            <SelectItem value="qwen">{t("filterQwen")}</SelectItem>
            <SelectItem value="kling">{t("filterKling")}</SelectItem>
            <SelectItem value="hailuo">{t("filterHailuo")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={promptKind || "all"} onValueChange={(v) => { setPromptKind(v === "all" ? "" : v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("filterAllKinds")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAllKinds")}</SelectItem>
            <SelectItem value="text">{t("filterText")}</SelectItem>
            <SelectItem value="image">{t("filterImage")}</SelectItem>
            <SelectItem value="video">{t("filterVideo")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <PageSkeleton />
      ) : (
        <DataTable
          data={items}
          pagination={{ page, pageSize, total }}
          onPageChange={setPage}
          onRowClick={(r) => router.push(`/prompts/detail?id=${r.id}`)}
          columns={[
            {
              key: "provider",
              header: t("columnProvider"),
              render: (r: PromptAuditRecord) => <span className="font-medium">{r.provider}</span>,
            },
            {
              key: "model",
              header: t("columnModel"),
              render: (r: PromptAuditRecord) => <span className="text-sm">{r.model}</span>,
            },
            {
              key: "step",
              header: t("columnStep"),
              render: (r: PromptAuditRecord) => <span className="text-xs text-muted-foreground">{r.step}</span>,
            },
            {
              key: "tokens",
              header: t("columnTokens"),
              render: (r: PromptAuditRecord) => (
                <span className="text-xs text-muted-foreground">
                  {t("tokensInOut", { input: r.inputTokens, output: r.outputTokens })}
                </span>
              ),
            },
            {
              key: "entity",
              header: t("columnEntity"),
              render: (r: PromptAuditRecord) => (
                <span className="text-xs text-muted-foreground">{r.relatedEntityType}</span>
              ),
            },
            {
              key: "time",
              header: t("columnTime"),
              render: (r: PromptAuditRecord) => <span className="text-xs text-muted-foreground">{formatTime(r.createdAt)}</span>,
            },
          ]}
        />
      )}
    </AdminPage>
  )
}
