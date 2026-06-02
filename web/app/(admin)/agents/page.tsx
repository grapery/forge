"use client"

import { useEffect, useState, useCallback } from "react"
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
      toast.success(`Agent "${actionAgent.name}" set to ${actionStatus}`)
      setActionAgent(null)
      setActionStatus(null)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Status update failed")
    }
  }

  const formatTime = (ts: number | null) => {
    if (!ts) return "-"
    return new Date(ts * 1000).toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Agents" description="Manage AI agents and their status" icon={Bot} />

      <div className="flex items-center gap-4">
        <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="error">Error</SelectItem>
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
              key: "name",
              header: "Name",
              render: (a: AgentItem) => (
                <span className="text-sm font-medium">{a.name}</span>
              ),
            },
            {
              key: "characterName",
              header: "Character",
              render: (a: AgentItem) => (
                <span className="text-sm text-muted-foreground">{a.characterName || "-"}</span>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (a: AgentItem) => (
                <Badge variant={statusVariant[a.status] || "secondary"}>{a.status}</Badge>
              ),
            },
            {
              key: "provider",
              header: "Provider",
              render: (a: AgentItem) => (
                <span className="text-sm text-muted-foreground">{a.provider || "-"}</span>
              ),
            },
            {
              key: "model",
              header: "Model",
              render: (a: AgentItem) => (
                <span className="text-sm text-muted-foreground">{a.model || "-"}</span>
              ),
            },
            {
              key: "interactionCount",
              header: "Interactions",
              render: (a: AgentItem) => (
                <span className="text-sm">{a.interactionCount || 0}</span>
              ),
            },
            {
              key: "skillCount",
              header: "Skills",
              render: (a: AgentItem) => (
                <span className="text-sm">{a.skillCount || 0}</span>
              ),
            },
            {
              key: "createdAt",
              header: "Created",
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
                      <PowerOff className="mr-1 h-3 w-3" />Deactivate
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-green-600"
                      onClick={(e) => { e.stopPropagation(); setActionAgent(a); setActionStatus("active") }}
                    >
                      <Power className="mr-1 h-3 w-3" />Activate
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
        title={actionStatus === "active" ? "Activate Agent" : "Deactivate Agent"}
        description={`Are you sure you want to ${actionStatus === "active" ? "activate" : "deactivate"} "${actionAgent?.name}"?`}
        confirmLabel={actionStatus === "active" ? "Activate" : "Deactivate"}
        variant={actionStatus === "active" ? "default" : "destructive"}
        onConfirm={handleUpdateStatus}
      />
    </div>
  )
}
