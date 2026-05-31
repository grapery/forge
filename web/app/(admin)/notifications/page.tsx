"use client"

import { useEffect, useState, useCallback } from "react"
import { notificationApi } from "@/lib/api/admin"
import type { NotificationItem } from "@/lib/types"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { SearchInput } from "@/components/shared/search-input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bell } from "lucide-react"

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [type, setType] = useState("")
  const pageSize = 20

  const fetchData = useCallback(() => {
    setLoading(true)
    notificationApi
      .list({
        page,
        pageSize,
        userId: search || undefined,
        type: type === "" || type === "all" ? undefined : type,
      })
      .then((data) => {
        setItems(data.items || [])
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, search, type])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const formatTime = (ts: number | null) => {
    if (!ts) return "-"
    return new Date(ts * 1000).toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="View notification history" />

      <div className="flex items-center gap-4">
        <div className="w-64">
          <SearchInput onSearch={setSearch} placeholder="Search by user ID..." />
        </div>
        <Select value={type || "all"} onValueChange={(v) => setType(v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="system">System</SelectItem>
            <SelectItem value="promotion">Promotion</SelectItem>
            <SelectItem value="social">Social</SelectItem>
            <SelectItem value="content">Content</SelectItem>
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
              key: "userId",
              header: "User ID",
              render: (item: NotificationItem) => (
                <span className="text-xs font-mono text-muted-foreground">{item.userId}</span>
              ),
            },
            {
              key: "type",
              header: "Type",
              render: (item: NotificationItem) => (
                <Badge variant="secondary">{item.type}</Badge>
              ),
            },
            {
              key: "title",
              header: "Title",
              render: (item: NotificationItem) => (
                <span className="text-sm font-medium">{item.title}</span>
              ),
            },
            {
              key: "content",
              header: "Content",
              render: (item: NotificationItem) => (
                <span className="text-xs text-muted-foreground">
                  {item.content.length > 60 ? item.content.substring(0, 60) + "..." : item.content}
                </span>
              ),
            },
            {
              key: "read",
              header: "Read",
              render: (item: NotificationItem) => (
                <Badge variant={item.read ? "default" : "secondary"}>
                  {item.read ? "Yes" : "No"}
                </Badge>
              ),
            },
            {
              key: "createdAt",
              header: "Created",
              render: (item: NotificationItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(item.createdAt)}</span>
              ),
            },
          ]}
        />
      )}
    </div>
  )
}
