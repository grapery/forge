"use client"

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"

import { accountDeletionApi } from "@/lib/api/admin"

import type { AccountDeletionItem, AccountDeletionStatusCount } from "@/lib/types"

import { PageHeader } from "@/components/shared/page-header"

import { DataTable } from "@/components/shared/data-table"

import { StatCard } from "@/components/shared/stat-card"

import { Badge } from "@/components/ui/badge"

import { Button } from "@/components/ui/button"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { UserMinus, UserX, Clock, Loader2, CheckCircle2, XCircle } from "lucide-react"

import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"


export default function AccountDeletionsPage() {
  const t = useTranslations("accountDeletions")
  const [items, setItems] = useState<AccountDeletionItem[]>([])
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState<AccountDeletionStatusCount | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState("")
  const pageSize = 20

  const [actionItem, setActionItem] = useState<AccountDeletionItem | null>(null)
  const [actionType, setActionType] = useState<"process" | "complete" | "cancel" | null>(null)

  const fetchData = useCallback(() => {
    setLoading(true)
    accountDeletionApi
      .list({ page, pageSize, status: status || undefined })
      .then((data) => {
        setItems(data.items || [])
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, status])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    accountDeletionApi.statusCounts().then(setCounts).catch(() => {})
  }, [])

  const handleAction = async () => {
    if (!actionItem || !actionType) return
    try {
      await accountDeletionApi.action(actionItem.id, { action: actionType })
      toast.success(t("toastActioned", { action: actionType, userName: actionItem.userName }))
      setActionItem(null)
      setActionType(null)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Action failed")
    }
  }

  const formatTime = (ts: number | null) => {
    if (!ts) return "-"
    return new Date(ts * 1000).toLocaleDateString()
  }

  const statusBadgeVariant = (s: string) => {
    switch (s) {
      case "pending": return "secondary"
      case "processing": return "default"
      case "completed": return "default"
      case "cancelled": return "destructive"
      default: return "secondary"
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} icon={UserX} />

      {counts && (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard title={t("statPending")} value={counts.pending} icon={Clock} />
          <StatCard title={t("statProcessing")} value={counts.processing} icon={Loader2} />
          <StatCard title={t("statCompleted")} value={counts.completed} icon={CheckCircle2} />
          <StatCard title={t("statCancelled")} value={counts.cancelled} icon={XCircle} />
        </div>
      )}

      <div className="flex items-center gap-4">
        <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("filterAllStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAllStatus")}</SelectItem>
            <SelectItem value="pending">{t("filterPending")}</SelectItem>
            <SelectItem value="processing">{t("filterProcessing")}</SelectItem>
            <SelectItem value="completed">{t("filterCompleted")}</SelectItem>
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
          columns={[
            {
              key: "user",
              header: t("columnUser"),
              render: (d: AccountDeletionItem) => (
                <span className="text-sm font-medium">{d.userName}</span>
              ),
            },
            {
              key: "reason",
              header: t("columnReason"),
              render: (d: AccountDeletionItem) => (
                <span className="text-sm text-muted-foreground">{d.reason || "-"}</span>
              ),
            },
            {
              key: "status",
              header: t("columnStatus"),
              render: (d: AccountDeletionItem) => (
                <Badge variant={statusBadgeVariant(d.status)}>{d.status}</Badge>
              ),
            },
            {
              key: "requestedAt",
              header: t("columnRequestedAt"),
              render: (d: AccountDeletionItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(d.requestedAt)}</span>
              ),
            },
            {
              key: "scheduledDeletion",
              header: t("columnScheduledDeletion"),
              render: (d: AccountDeletionItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(d.scheduledDeletionAt)}</span>
              ),
            },
            {
              key: "created",
              header: t("columnCreated"),
              render: (d: AccountDeletionItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(d.createdAt)}</span>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (d: AccountDeletionItem) => (
                <div className="flex gap-1">
                  {d.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); setActionItem(d); setActionType("process") }}
                    >
                      <Loader2 className="mr-1 h-3 w-3" />{t("buttonProcess")}
                    </Button>
                  )}
                  {d.status === "processing" && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setActionItem(d); setActionType("complete") }}
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />{t("buttonComplete")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={(e) => { e.stopPropagation(); setActionItem(d); setActionType("cancel") }}
                      >
                        <XCircle className="mr-1 h-3 w-3" />{t("buttonCancel")}
                      </Button>
                    </>
                  )}
                </div>
              ),
            },
          ]}
        />
      )}

      <ConfirmDialog
        open={!!actionItem && !!actionType}
        onOpenChange={(o) => { if (!o) { setActionItem(null); setActionType(null) } }}
        title={t("dialogTitle", { action: actionType || "" })}
        description={t("dialogDescription", { action: actionType || "", userName: actionItem?.userName || "" })}
        confirmLabel={t("dialogConfirm", { action: actionType || "" })}
        variant={actionType === "cancel" ? "destructive" : "default"}
        onConfirm={handleAction}
      />
    </div>
  )
}
