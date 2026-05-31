"use client"

import { useEffect, useState, useCallback } from "react"
import { aiGenerationApi } from "@/lib/api/admin"
import type { AIGenerationRecordItem, AIGenerationSummary } from "@/lib/types"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { StatCard } from "@/components/shared/stat-card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Image, Video, Type, BarChart3 } from "lucide-react"

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  running: "default",
  completed: "secondary",
  failed: "destructive",
}

export default function AIGenerationsPage() {
  const [items, setItems] = useState<AIGenerationRecordItem[]>([])
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState<AIGenerationSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [type, setType] = useState("")
  const pageSize = 20

  const fetchData = useCallback(() => {
    setLoading(true)
    aiGenerationApi
      .list({ page, pageSize, type: type || undefined })
      .then((data) => {
        setItems(data.items || [])
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, type])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    aiGenerationApi.summary().then(setSummary).catch(() => {})
  }, [])

  const formatTime = (ts: number | null) => {
    if (!ts) return "-"
    return new Date(ts * 1000).toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      <PageHeader title="AI Generations" description="View AI generation history and usage metrics" />

      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard title="Total Records" value={summary.totalRecords} icon={BarChart3} />
          <StatCard title="Total Tokens" value={summary.totalTokens} icon={Type} />
          <StatCard title="Total Images" value={summary.totalImages} icon={Image} />
          <StatCard title="Total Videos" value={summary.totalVideos} icon={Video} />
        </div>
      )}

      <div className="flex items-center gap-4">
        <Select value={type || "all"} onValueChange={(v) => setType(v === "all" ? "" : v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="image_generation">Image Generation</SelectItem>
            <SelectItem value="video_generation">Video Generation</SelectItem>
            <SelectItem value="text_generation">Text Generation</SelectItem>
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
          columns={[
            {
              key: "userName",
              header: "User",
              render: (r: AIGenerationRecordItem) => (
                <span className="text-sm text-muted-foreground">{r.userName}</span>
              ),
            },
            {
              key: "type",
              header: "Type",
              render: (r: AIGenerationRecordItem) => (
                <span className="text-sm font-medium">{r.type}</span>
              ),
            },
            {
              key: "provider",
              header: "Provider",
              render: (r: AIGenerationRecordItem) => (
                <span className="text-sm text-muted-foreground">{r.provider || "-"}</span>
              ),
            },
            {
              key: "model",
              header: "Model",
              render: (r: AIGenerationRecordItem) => (
                <span className="text-sm text-muted-foreground">{r.model || "-"}</span>
              ),
            },
            {
              key: "inputTokens",
              header: "Input Tokens",
              render: (r: AIGenerationRecordItem) => (
                <span className="text-sm">{r.inputTokens || 0}</span>
              ),
            },
            {
              key: "outputTokens",
              header: "Output Tokens",
              render: (r: AIGenerationRecordItem) => (
                <span className="text-sm">{r.outputTokens || 0}</span>
              ),
            },
            {
              key: "totalTokens",
              header: "Total Tokens",
              render: (r: AIGenerationRecordItem) => (
                <span className="text-sm font-medium">{r.totalTokens || 0}</span>
              ),
            },
            {
              key: "imageCount",
              header: "Images",
              render: (r: AIGenerationRecordItem) => (
                <span className="text-sm">{r.imageCount || 0}</span>
              ),
            },
            {
              key: "videoCount",
              header: "Videos",
              render: (r: AIGenerationRecordItem) => (
                <span className="text-sm">{r.videoCount || 0}</span>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (r: AIGenerationRecordItem) => (
                <Badge variant={statusVariant[r.status] || "secondary"}>{r.status}</Badge>
              ),
            },
            {
              key: "durationMs",
              header: "Duration",
              render: (r: AIGenerationRecordItem) => (
                <span className="text-sm">{r.durationMs ? `${r.durationMs}ms` : "-"}</span>
              ),
            },
            {
              key: "relatedEntityType",
              header: "Entity",
              render: (r: AIGenerationRecordItem) => (
                <span className="text-xs text-muted-foreground">{r.relatedEntityType || "-"}</span>
              ),
            },
            {
              key: "errorMessage",
              header: "Error",
              render: (r: AIGenerationRecordItem) => (
                <span className="max-w-[200px] truncate text-xs text-destructive" title={r.errorMessage}>
                  {r.errorMessage ? (r.errorMessage.length > 40 ? r.errorMessage.slice(0, 40) + "..." : r.errorMessage) : "-"}
                </span>
              ),
            },
            {
              key: "createdAt",
              header: "Created",
              render: (r: AIGenerationRecordItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(r.createdAt)}</span>
              ),
            },
          ]}
        />
      )}
    </div>
  )
}
