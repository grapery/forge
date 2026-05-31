"use client"

import { useEffect, useState, useCallback } from "react"
import { auditLogApi } from "@/lib/api/admin"
import type { AdminOperationLog } from "@/lib/types"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

const actionColors: Record<string, string> = {
  create: "bg-green-100 text-green-800",
  update: "bg-blue-100 text-blue-800",
  delete: "bg-red-100 text-red-800",
  login: "bg-purple-100 text-purple-800",
}

export default function AuditLogPage() {
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
      <PageHeader title="Audit Log" description="Track all admin operations" />

      <div className="flex items-center gap-4">
        <Select value={action || "all"} onValueChange={(v) => { setAction(v === "all" ? "" : v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="create">Create</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
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
        <div className="py-12 text-center text-muted-foreground">Loading...</div>
      ) : (
        <DataTable
          data={items}
          pagination={{ page, pageSize, total }}
          onPageChange={setPage}
          columns={[
            {
              key: "action",
              header: "Action",
              render: (log: AdminOperationLog) => (
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${actionColors[log.action] || "bg-gray-100 text-gray-800"}`}>
                  {log.action}
                </span>
              ),
            },
            {
              key: "resource",
              header: "Resource",
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
              header: "Admin",
              render: (log: AdminOperationLog) => <span className="text-sm">{log.adminName}</span>,
            },
            {
              key: "ip",
              header: "IP",
              render: (log: AdminOperationLog) => <span className="text-xs font-mono text-muted-foreground">{log.ip}</span>,
            },
            {
              key: "time",
              header: "Time",
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
