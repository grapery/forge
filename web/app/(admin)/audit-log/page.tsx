"use client"

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"

import { auditLogApi } from "@/lib/api/admin"

import type { AdminOperationLog } from "@/lib/types"

import { PageHeader } from "@/components/shared/page-header"

import { DataTable } from "@/components/shared/data-table"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { Badge } from "@/components/ui/badge"

import { ScrollText } from "lucide-react"


const actionColors: Record<string, string> = {
  create: "bg-green-100 text-green-800",
  update: "bg-blue-100 text-blue-800",
  delete: "bg-red-100 text-red-800",
  login: "bg-purple-100 text-purple-800",
}

export default function AuditLogPage() {
  const t = useTranslations("auditLog")
  const [items, setItems] = useState<AdminOperationLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [action, setAction] = useState("")
  const [resource, setResource] = useState("")
  const pageSize = 20

  const fetchData = useCallback(() => {
    setLoading(true)
    auditLogApi
      .list({
        page,
        pageSize,
        action: action || undefined,
        resource: resource || undefined,
      })
      .then((data) => {
        setItems(data.items || [])
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, action, resource])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} icon={ScrollText} />

      <div className="flex items-center gap-4">
        <Select value={action || "all"} onValueChange={(v) => { setAction(v === "all" ? "" : v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("filterAllActions")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAllActions")}</SelectItem>
            <SelectItem value="create">{t("filterCreate")}</SelectItem>
            <SelectItem value="update">{t("filterUpdate")}</SelectItem>
            <SelectItem value="delete">{t("filterDelete")}</SelectItem>
            <SelectItem value="login">Login</SelectItem>
          </SelectContent>
        </Select>
        <Select value={resource || "all"} onValueChange={(v) => { setResource(v === "all" ? "" : v); setPage(1) }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Resources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Resources</SelectItem>
            <SelectItem value="admin_user">Admin User</SelectItem>
            <SelectItem value="feedback">Feedback</SelectItem>
            <SelectItem value="report">Report</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="story">Story</SelectItem>
            <SelectItem value="storyboard">Storyboard</SelectItem>
            <SelectItem value="fragment">Fragment</SelectItem>
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
              key: "action",
              header: t("columnAction"),
              render: (log: AdminOperationLog) => (
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${actionColors[log.action] || "bg-gray-100 text-gray-800"}`}>
                  {log.action}
                </span>
              ),
            },
            {
              key: "resource",
              header: t("columnResource"),
              render: (log: AdminOperationLog) => (
                <div>
                  <span className="text-sm">{log.resource}</span>
                  {log.resourceId && (
                    <span className="ml-2 text-xs font-mono text-muted-foreground">{log.resourceId.slice(0, 8)}</span>
                  )}
                </div>
              ),
            },
            {
              key: "admin",
              header: t("columnAdmin"),
              render: (log: AdminOperationLog) => <span className="text-sm">{log.adminName}</span>,
            },
            {
              key: "ip",
              header: t("columnIp"),
              render: (log: AdminOperationLog) => <span className="text-xs font-mono text-muted-foreground">{log.ip}</span>,
            },
            {
              key: "time",
              header: t("columnTime"),
              render: (log: AdminOperationLog) => (
                <span className="text-xs text-muted-foreground">{new Date(log.createdAt * 1000).toLocaleString()}</span>
              ),
            },
          ]}
        />
      )}
    </div>
  )
}
