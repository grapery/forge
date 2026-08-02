"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"

import { aiTaskApi } from "@/lib/api/admin"

import type { AITaskItem, AITaskSummary } from "@/lib/types"

import { PageHeader } from "@/components/shared/page-header"

import { DataTable } from "@/components/shared/data-table"

import { SearchInput } from "@/components/shared/search-input"

import { StatCard } from "@/components/shared/stat-card"

import { Badge } from "@/components/ui/badge"

import { Button } from "@/components/ui/button"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { ListTodo, Clock, CheckCircle, XCircle, Ban, Brain, Pause, Play, Zap } from "lucide-react"

import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"


const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  running: "default",
  completed: "secondary",
  failed: "destructive",
  cancelled: "secondary",
}


type QuickFilter = "active" | "all" | "completed" | "failed"


function formatDuration(seconds: number): string {
  if (seconds < 0 || !isFinite(seconds)) return "-"
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}


function toSeconds(ts: number | null | undefined): number | null {
  if (ts == null) return null
  return ts > 1e12 ? ts / 1000 : ts
}


export default function AITasksPage() {
  const router = useRouter()
  const t = useTranslations("aiTasks")
  const [items, setItems] = useState<AITaskItem[]>([])
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState<AITaskSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState("")
  const [type, setType] = useState("")
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("active")
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkCancelOpen, setBulkCancelOpen] = useState(false)
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [cancelTask, setCancelTask] = useState<AITaskItem | null>(null)
  const pageSize = 20

  const fetchData = useCallback(async () => {
    if (quickFilter === "active") {
      const [pending, running] = await Promise.all([
        aiTaskApi.list({ page: 1, pageSize: 100, status: "pending", type: type || undefined }),
        aiTaskApi.list({ page: 1, pageSize: 100, status: "running", type: type || undefined }),
      ])
      const merged = [...(running.items || []), ...(pending.items || [])]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, pageSize)
      setItems(merged)
      setTotal((pending.total || 0) + (running.total || 0))
      return
    }
    const statusFilter = quickFilter === "completed" ? "completed" : quickFilter === "failed" ? "failed" : (status || undefined)
    const data = await aiTaskApi.list({
      page,
      pageSize,
      status: statusFilter,
      type: type || undefined,
    })
    setItems(data.items || [])
    setTotal(data.total)
  }, [quickFilter, page, status, type])

  const refreshSummary = useCallback(() => {
    aiTaskApi.summary().then(setSummary).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchData().catch(() => {}).finally(() => setLoading(false))
  }, [fetchData])

  useEffect(() => {
    refreshSummary()
  }, [refreshSummary])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return
      if (bulkProcessing) return
      fetchData().catch(() => {})
      refreshSummary()
    }, 10000)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchData, refreshSummary, bulkProcessing])

  const handleQuickFilter = (q: QuickFilter) => {
    setQuickFilter(q)
    setStatus("")
    setPage(1)
    setSelected(new Set())
  }

  const handleStatusChange = (v: string) => {
    setQuickFilter("all")
    setStatus(v === "all" ? "" : v)
    setPage(1)
    setSelected(new Set())
  }

  const handleSingleCancel = async () => {
    if (!cancelTask) return
    try {
      await aiTaskApi.cancel(cancelTask.id)
      toast.success(t("toastCancelled", { type: cancelTask.type }))
      setCancelTask(null)
      await fetchData()
      refreshSummary()
    } catch (err: any) {
      toast.error(err.message || t("toastCancelFailed"))
    }
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBulkCancel = async () => {
    setBulkProcessing(true)
    let success = 0
    let failed = 0
    try {
      const results = await Promise.allSettled(
        Array.from(selected).map((id) => aiTaskApi.cancel(id)),
      )
      for (const r of results) {
        if (r.status === "fulfilled") success++
        else failed++
      }
      if (failed === 0) {
        toast.success(t("toastBulkSuccess", { count: success }))
      } else {
        toast.error(t("toastBulkPartial", { success, failed }))
      }
      setSelected(new Set())
      setBulkCancelOpen(false)
      await fetchData()
      refreshSummary()
    } catch (err: any) {
      toast.error(err.message || t("toastCancelFailed"))
    } finally {
      setBulkProcessing(false)
    }
  }

  const formatTime = (ts: number | null) => {
    if (!ts) return "-"
    return new Date(ts * 1000).toLocaleString()
  }

  const queueDuration = (item: AITaskItem) => {
    const started = toSeconds(item.startedAt)
    if (started == null) return null
    const created = toSeconds(item.createdAt)
    if (created == null) return null
    return started - created
  }

  const execDuration = (item: AITaskItem) => {
    const started = toSeconds(item.startedAt)
    if (started == null) return null
    const completed = toSeconds(item.completedAt)
    if (completed != null) return completed - started
    if (item.status === "running") return Date.now() / 1000 - started
    return null
  }

  const entityHref = (item: AITaskItem): string | null => {
    if (!item.relatedEntityType || !item.relatedEntityId) return null
    if (item.relatedEntityType === "fragment") return `/fragments/detail?id=${item.relatedEntityId}`
    if (item.relatedEntityType === "storyboard") return `/storyboards/detail?id=${item.relatedEntityId}`
    if (item.relatedEntityType === "story") return `/content/detail?id=${item.relatedEntityId}&type=story`
    return null
  }

  const columns = [
    {
      key: "_select",
      header: "",
      render: (item: AITaskItem) => {
        const canCancel = item.status === "pending" || item.status === "running"
        return (
          <input
            type="checkbox"
            disabled={!canCancel}
            checked={selected.has(item.id)}
            onClick={(e) => e.stopPropagation()}
            onChange={() => toggleSelect(item.id)}
            className="h-4 w-4 rounded border-border"
          />
        )
      },
    },
    {
      key: "userName",
      header: t("columnUser"),
      render: (item: AITaskItem) => <span className="text-sm text-muted-foreground">{item.userName}</span>,
    },
    {
      key: "type",
      header: t("columnType"),
      render: (item: AITaskItem) => <span className="text-sm font-medium">{item.type}</span>,
    },
    {
      key: "status",
      header: t("columnStatus"),
      render: (item: AITaskItem) => <Badge variant={statusVariant[item.status] || "secondary"}>{item.status}</Badge>,
    },
    {
      key: "provider",
      header: t("columnProvider"),
      render: (item: AITaskItem) => <span className="text-sm text-muted-foreground">{item.provider || "-"}</span>,
    },
    {
      key: "progress",
      header: t("columnProgress"),
      render: (item: AITaskItem) => {
        if (item.progress == null) return <span className="text-sm text-muted-foreground">-</span>
        return (
          <div className="flex items-center gap-2 min-w-[120px]">
            <div className="h-2 flex-1 rounded bg-secondary/60 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, item.progress))}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums w-9 text-right">{item.progress}%</span>
          </div>
        )
      },
    },
    {
      key: "queueTime",
      header: t("columnQueueTime"),
      render: (item: AITaskItem) => {
        const d = queueDuration(item)
        return <span className="text-xs text-muted-foreground">{d == null ? "-" : formatDuration(d)}</span>
      },
    },
    {
      key: "execTime",
      header: t("columnExecTime"),
      render: (item: AITaskItem) => {
        const d = execDuration(item)
        return <span className="text-xs text-muted-foreground">{d == null ? "-" : formatDuration(d)}</span>
      },
    },
    {
      key: "relatedEntityType",
      header: t("columnEntity"),
      render: (item: AITaskItem) => {
        const href = entityHref(item)
        if (!item.relatedEntityType) return <span className="text-xs text-muted-foreground">-</span>
        if (!href) return <Badge variant="outline">{item.relatedEntityType}</Badge>
        return (
          <button
            onClick={(e) => { e.stopPropagation(); router.push(href) }}
            className="hover:underline"
          >
            <Badge variant="outline" className="text-primary border-primary/40 hover:bg-primary/10 cursor-pointer">
              {item.relatedEntityType}
            </Badge>
          </button>
        )
      },
    },
    {
      key: "errorMessage",
      header: t("columnError"),
      render: (item: AITaskItem) => (
        <span className="max-w-[200px] truncate text-xs text-destructive block" title={item.errorMessage}>
          {item.errorMessage ? (item.errorMessage.length > 40 ? item.errorMessage.slice(0, 40) + "..." : item.errorMessage) : "-"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: t("columnCreated"),
      render: (item: AITaskItem) => <span className="text-xs text-muted-foreground">{formatTime(item.createdAt)}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (item: AITaskItem) => (
        <div className="flex gap-1">
          {(item.status === "pending" || item.status === "running") && (
            <Button variant="ghost" size="sm" className="text-destructive" onClick={(e) => { e.stopPropagation(); setCancelTask(item) }}>
              <Ban className="mr-1 h-3 w-3" />{t("buttonCancel")}
            </Button>
          )}
        </div>
      ),
    },
  ]

  const quickFilterButtons: { value: QuickFilter; labelKey: string; icon: any }[] = [
    { value: "active", labelKey: "buttonQuickActive", icon: Zap },
    { value: "all", labelKey: "buttonQuickAll", icon: ListTodo },
    { value: "completed", labelKey: "buttonQuickCompleted", icon: CheckCircle },
    { value: "failed", labelKey: "buttonQuickFailed", icon: XCircle },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} icon={Brain} />

      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard title={t("statTotalTasks")} value={summary.totalTasks} icon={ListTodo} />
          <StatCard title={t("statPending")} value={summary.pendingTasks} icon={Clock} />
          <StatCard title={t("statCompleted")} value={summary.completedTasks} icon={CheckCircle} />
          <StatCard title={t("statFailed")} value={summary.failedTasks} icon={XCircle} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary/40 p-1">
          {quickFilterButtons.map((q) => (
            <Button
              key={q.value}
              size="sm"
              variant={quickFilter === q.value ? "default" : "ghost"}
              onClick={() => handleQuickFilter(q.value)}
              className="h-7 text-xs"
            >
              <q.icon className="mr-1 h-3 w-3" />
              {t(q.labelKey)}
            </Button>
          ))}
        </div>

        <Select value={quickFilter === "all" ? (status || "all") : "all"} onValueChange={handleStatusChange} disabled={quickFilter !== "all"}>
          <SelectTrigger className="w-40 h-8">
            <SelectValue placeholder={t("filterAllStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAllStatus")}</SelectItem>
            <SelectItem value="pending">{t("filterPending")}</SelectItem>
            <SelectItem value="running">{t("filterRunning")}</SelectItem>
            <SelectItem value="completed">{t("filterCompleted")}</SelectItem>
            <SelectItem value="failed">{t("filterFailed")}</SelectItem>
            <SelectItem value="cancelled">{t("filterCancelled")}</SelectItem>
          </SelectContent>
        </Select>

        <div className="w-48">
          <SearchInput onSearch={(v) => { setType(v); setPage(1) }} placeholder={t("searchPlaceholder")} />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {selected.size > 0 && (
            <Button size="sm" variant="destructive" onClick={() => setBulkCancelOpen(true)}>
              <Ban className="mr-1 h-3 w-3" />
              {t("buttonBulkCancel", { count: selected.size })}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAutoRefresh((v) => !v)}
            className="h-8"
          >
            {autoRefresh ? <Pause className="mr-1 h-3 w-3" /> : <Play className="mr-1 h-3 w-3" />}
            {autoRefresh ? t("autoRefreshPause") : t("autoRefreshResume")}
          </Button>
          {autoRefresh && (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              {t("autoRefreshIndicator")}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <PageSkeleton />
      ) : quickFilter === "active" ? (
        <>
          <p className="text-xs text-muted-foreground">{t("activeModeHint", { count: items.length, total })}</p>
          <DataTable
            data={items}
            pagination={{ page: 1, pageSize, total: items.length }}
            onPageChange={() => {}}
            onRowClick={(item) => router.push(`/ai-tasks/detail?id=${item.id}`)}
            columns={columns}
          />
        </>
      ) : (
        <DataTable
          data={items}
          pagination={{ page, pageSize, total }}
          onPageChange={setPage}
          onRowClick={(item) => router.push(`/ai-tasks/detail?id=${item.id}`)}
          columns={columns}
        />
      )}

      <ConfirmDialog
        open={!!cancelTask}
        onOpenChange={(o) => { if (!o) setCancelTask(null) }}
        title={t("dialogCancelTitle")}
        description={t("dialogCancelDescription", { type: cancelTask?.type || "" })}
        confirmLabel={t("dialogConfirmCancel")}
        variant="destructive"
        onConfirm={handleSingleCancel}
      />

      <ConfirmDialog
        open={bulkCancelOpen}
        onOpenChange={(o) => setBulkCancelOpen(o)}
        title={t("dialogBulkCancelTitle")}
        description={t("dialogBulkCancelDescription", { count: selected.size })}
        confirmLabel={t("buttonBulkCancel", { count: selected.size })}
        variant="destructive"
        loading={bulkProcessing}
        onConfirm={handleBulkCancel}
      />
    </div>
  )
}
