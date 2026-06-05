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

import { ListTodo, Clock, CheckCircle, XCircle, Ban, Brain } from "lucide-react"

import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"


const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  running: "default",
  completed: "secondary",
  failed: "destructive",
  cancelled: "secondary",
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
  const pageSize = 20

  const [cancelTask, setCancelTask] = useState<AITaskItem | null>(null)

  const fetchData = useCallback(() => {
    setLoading(true)
    aiTaskApi
      .list({ page, pageSize, status: status || undefined, type: type || undefined })
      .then((data) => {
        setItems(data.items || [])
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, status, type])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    aiTaskApi.summary().then(setSummary).catch(() => {})
  }, [])

  const handleCancel = async () => {
    if (!cancelTask) return
    try {
      await aiTaskApi.cancel(cancelTask.id)
      toast.success(t("toastCancelled", { type: cancelTask.type }))
      setCancelTask(null)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || t("toastCancelFailed"))
    }
  }

  const formatTime = (ts: number | null) => {
    if (!ts) return "-"
    return new Date(ts * 1000).toLocaleDateString()
  }

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

      <div className="flex items-center gap-4">
        <div className="w-64">
          <SearchInput onSearch={setType} placeholder={t("searchPlaceholder")} />
        </div>
        <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40">
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
      </div>

      {loading ? (
        <PageSkeleton />
      ) : (
        <DataTable
          data={items}
          pagination={{ page, pageSize, total }}
          onPageChange={setPage}
          onRowClick={(item) => router.push(`/ai-tasks/detail?id=${item.id}`)}
          columns={[
            {
              key: "userName",
              header: t("columnUser"),
              render: (item: AITaskItem) => (
                <span className="text-sm text-muted-foreground">{item.userName}</span>
              ),
            },
            {
              key: "type",
              header: t("columnType"),
              render: (item: AITaskItem) => (
                <span className="text-sm font-medium">{item.type}</span>
              ),
            },
            {
              key: "status",
              header: t("columnStatus"),
              render: (item: AITaskItem) => (
                <Badge variant={statusVariant[item.status] || "secondary"}>{item.status}</Badge>
              ),
            },
            {
              key: "provider",
              header: t("columnProvider"),
              render: (item: AITaskItem) => (
                <span className="text-sm text-muted-foreground">{item.provider || "-"}</span>
              ),
            },
            {
              key: "model",
              header: t("columnModel"),
              render: (item: AITaskItem) => (
                <span className="text-sm text-muted-foreground">{item.model || "-"}</span>
              ),
            },
            {
              key: "tokensUsed",
              header: t("columnTokens"),
              render: (item: AITaskItem) => (
                <span className="text-sm">{item.tokensUsed || 0}</span>
              ),
            },
            {
              key: "progress",
              header: t("columnProgress"),
              render: (item: AITaskItem) => (
                <span className="text-sm">{item.progress != null ? `${item.progress}%` : "-"}</span>
              ),
            },
            {
              key: "relatedEntityType",
              header: t("columnEntity"),
              render: (item: AITaskItem) => (
                <span className="text-xs text-muted-foreground">{item.relatedEntityType || "-"}</span>
              ),
            },
            {
              key: "errorMessage",
              header: t("columnError"),
              render: (item: AITaskItem) => (
                <span className="max-w-[200px] truncate text-xs text-destructive" title={item.errorMessage}>
                  {item.errorMessage ? (item.errorMessage.length > 40 ? item.errorMessage.slice(0, 40) + "..." : item.errorMessage) : "-"}
                </span>
              ),
            },
            {
              key: "createdAt",
              header: t("columnCreated"),
              render: (item: AITaskItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(item.createdAt)}</span>
              ),
            },
            {
              key: "startedAt",
              header: t("columnStarted"),
              render: (item: AITaskItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(item.startedAt)}</span>
              ),
            },
            {
              key: "completedAt",
              header: t("columnCompletedAt"),
              render: (item: AITaskItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(item.completedAt)}</span>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (item: AITaskItem) => (
                <div className="flex gap-1">
                  {(item.status === "pending" || item.status === "running") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={(e) => { e.stopPropagation(); setCancelTask(item) }}
                    >
                      <Ban className="mr-1 h-3 w-3" />{t("buttonCancel")}
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
        />
      )}

      <ConfirmDialog
        open={!!cancelTask}
        onOpenChange={(o) => { if (!o) setCancelTask(null) }}
        title={t("dialogCancelTitle")}
        description={t("dialogCancelDescription", { type: cancelTask?.type || "" })}
        confirmLabel={t("dialogConfirmCancel")}
        variant="destructive"
        onConfirm={handleCancel}
      />
    </div>
  )
}
