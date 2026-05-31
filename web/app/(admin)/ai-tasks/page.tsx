"use client"

import { useEffect, useState, useCallback } from "react"
import { aiTaskApi } from "@/lib/api/admin"
import type { AITaskItem, AITaskSummary } from "@/lib/types"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { SearchInput } from "@/components/shared/search-input"
import { StatCard } from "@/components/shared/stat-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ListTodo, Clock, CheckCircle, XCircle, Ban } from "lucide-react"
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
      toast.success(`Task "${cancelTask.type}" cancelled`)
      setCancelTask(null)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Cancel failed")
    }
  }

  const formatTime = (ts: number | null) => {
    if (!ts) return "-"
    return new Date(ts * 1000).toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      <PageHeader title="AI Tasks" description="Monitor and manage AI task executions" />

      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard title="Total Tasks" value={summary.totalTasks} icon={ListTodo} />
          <StatCard title="Pending" value={summary.pendingTasks} icon={Clock} />
          <StatCard title="Completed" value={summary.completedTasks} icon={CheckCircle} />
          <StatCard title="Failed" value={summary.failedTasks} icon={XCircle} />
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="w-64">
          <SearchInput onSearch={setType} placeholder="Search by type..." />
        </div>
        <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
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
              render: (t: AITaskItem) => (
                <span className="text-sm text-muted-foreground">{t.userName}</span>
              ),
            },
            {
              key: "type",
              header: "Type",
              render: (t: AITaskItem) => (
                <span className="text-sm font-medium">{t.type}</span>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (t: AITaskItem) => (
                <Badge variant={statusVariant[t.status] || "secondary"}>{t.status}</Badge>
              ),
            },
            {
              key: "provider",
              header: "Provider",
              render: (t: AITaskItem) => (
                <span className="text-sm text-muted-foreground">{t.provider || "-"}</span>
              ),
            },
            {
              key: "model",
              header: "Model",
              render: (t: AITaskItem) => (
                <span className="text-sm text-muted-foreground">{t.model || "-"}</span>
              ),
            },
            {
              key: "tokensUsed",
              header: "Tokens",
              render: (t: AITaskItem) => (
                <span className="text-sm">{t.tokensUsed || 0}</span>
              ),
            },
            {
              key: "progress",
              header: "Progress",
              render: (t: AITaskItem) => (
                <span className="text-sm">{t.progress != null ? `${t.progress}%` : "-"}</span>
              ),
            },
            {
              key: "relatedEntityType",
              header: "Entity",
              render: (t: AITaskItem) => (
                <span className="text-xs text-muted-foreground">{t.relatedEntityType || "-"}</span>
              ),
            },
            {
              key: "errorMessage",
              header: "Error",
              render: (t: AITaskItem) => (
                <span className="max-w-[200px] truncate text-xs text-destructive" title={t.errorMessage}>
                  {t.errorMessage ? (t.errorMessage.length > 40 ? t.errorMessage.slice(0, 40) + "..." : t.errorMessage) : "-"}
                </span>
              ),
            },
            {
              key: "createdAt",
              header: "Created",
              render: (t: AITaskItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(t.createdAt)}</span>
              ),
            },
            {
              key: "startedAt",
              header: "Started",
              render: (t: AITaskItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(t.startedAt)}</span>
              ),
            },
            {
              key: "completedAt",
              header: "Completed",
              render: (t: AITaskItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(t.completedAt)}</span>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (t: AITaskItem) => (
                <div className="flex gap-1">
                  {(t.status === "pending" || t.status === "running") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={(e) => { e.stopPropagation(); setCancelTask(t) }}
                    >
                      <Ban className="mr-1 h-3 w-3" />Cancel
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
        title="Cancel Task"
        description={`Are you sure you want to cancel this ${cancelTask?.type || ""} task?`}
        confirmLabel="Cancel Task"
        variant="destructive"
        onConfirm={handleCancel}
      />
    </div>
  )
}
