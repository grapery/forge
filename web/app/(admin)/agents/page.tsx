"use client"

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"

import { agentApi } from "@/lib/api/admin"

import type { AgentItem } from "@/lib/types"

import { PageHeader } from "@/components/shared/page-header"

import { DataTable } from "@/components/shared/data-table"

import { Badge } from "@/components/ui/badge"

import { Button } from "@/components/ui/button"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { Power, PowerOff, Bot } from "lucide-react"

import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"


const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  inactive: "secondary",
  error: "destructive",
}

export default function AgentsPage() {
  const t = useTranslations("agents")
  const [items, setItems] = useState<AgentItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState("")
  const pageSize = 20

  const [actionAgent, setActionAgent] = useState<AgentItem | null>(null)
  const [actionStatus, setActionStatus] = useState<"active" | "inactive" | null>(null)

  const fetchData = useCallback(() => {
    setLoading(true)
    agentApi
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

  const handleUpdateStatus = async () => {
    if (!actionAgent || !actionStatus) return
    try {
      await agentApi.updateStatus(actionAgent.id, { status: actionStatus })
      toast.success(t("toastStatusSet", { name: actionAgent.name, status: actionStatus }))
      setActionAgent(null)
      setActionStatus(null)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || t("toastStatusFailed"))
    }
  }

  const formatTime = (ts: number | null) => {
    if (!ts) return "-"
    return new Date(ts * 1000).toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} icon={Bot} />

      <div className="flex items-center gap-4">
        <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("filterAllStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAllStatus")}</SelectItem>
            <SelectItem value="active">{t("filterActive")}</SelectItem>
            <SelectItem value="inactive">{t("filterInactive")}</SelectItem>
            <SelectItem value="error">{t("filterError")}</SelectItem>
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
              key: "name",
              header: t("columnName"),
              render: (a: AgentItem) => (
                <span className="text-sm font-medium">{a.name}</span>
              ),
            },
            {
              key: "characterName",
              header: t("columnCharacter"),
              render: (a: AgentItem) => (
                <span className="text-sm text-muted-foreground">{a.characterName || "-"}</span>
              ),
            },
            {
              key: "status",
              header: t("columnStatus"),
              render: (a: AgentItem) => (
                <Badge variant={statusVariant[a.status] || "secondary"}>{a.status}</Badge>
              ),
            },
            {
              key: "provider",
              header: t("columnProvider"),
              render: (a: AgentItem) => (
                <span className="text-sm text-muted-foreground">{a.provider || "-"}</span>
              ),
            },
            {
              key: "model",
              header: t("columnModel"),
              render: (a: AgentItem) => (
                <span className="text-sm text-muted-foreground">{a.model || "-"}</span>
              ),
            },
            {
              key: "interactionCount",
              header: t("columnInteractions"),
              render: (a: AgentItem) => (
                <span className="text-sm">{a.interactionCount || 0}</span>
              ),
            },
            {
              key: "skillCount",
              header: t("columnSkills"),
              render: (a: AgentItem) => (
                <span className="text-sm">{a.skillCount || 0}</span>
              ),
            },
            {
              key: "createdAt",
              header: t("columnCreated"),
              render: (a: AgentItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(a.createdAt)}</span>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (a: AgentItem) => (
                <div className="flex gap-1">
                  {a.status === "active" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={(e) => { e.stopPropagation(); setActionAgent(a); setActionStatus("inactive") }}
                    >
                      <PowerOff className="mr-1 h-3 w-3" />{t("buttonDeactivate")}
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-emerald-400"
                      onClick={(e) => { e.stopPropagation(); setActionAgent(a); setActionStatus("active") }}
                    >
                      <Power className="mr-1 h-3 w-3" />{t("buttonActivate")}
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
        />
      )}

      <ConfirmDialog
        open={!!actionAgent && !!actionStatus}
        onOpenChange={(o) => { if (!o) { setActionAgent(null); setActionStatus(null) } }}
        title={actionStatus === "active" ? t("dialogActivateTitle") : t("dialogDeactivateTitle")}
        description={actionStatus === "active" ? t("dialogActivateDescription", { name: actionAgent?.name || "" }) : t("dialogDeactivateDescription", { name: actionAgent?.name || "" })}
        confirmLabel={actionStatus === "active" ? t("dialogConfirmActivate") : t("dialogConfirmDeactivate")}
        variant={actionStatus === "active" ? "default" : "destructive"}
        onConfirm={handleUpdateStatus}
      />
    </div>
  )
}
