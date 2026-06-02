"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { reportApi } from "@/lib/api/admin"
import type { Report } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"
import { Flag } from "lucide-react"

const statusOptions = ["", "pending", "reviewed", "resolved", "dismissed"]

const statusLabel: Record<string, string> = {
  pending: "Pending",
  reviewed: "Reviewed",
  resolved: "Resolved",
  dismissed: "Dismissed",
}

const statusColor: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  reviewed: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  dismissed: "bg-gray-100 text-gray-800",
}

function ReportStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[status] || "bg-gray-100 text-gray-800"}`}>
      {statusLabel[status] || status}
    </span>
  )
}

export default function ReportsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [items, setItems] = useState<Report[]>([])
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState<Record<string, number> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "")
  const pageSize = 20

  useEffect(() => {
    reportApi.statusCounts().then(setCounts).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setError("")
    reportApi
      .list({ page, pageSize, status: statusFilter })
      .then((data) => {
        setItems(data.items || [])
        setTotal(data.total)
      })
      .catch((err) => setError(err.message || "Failed to load reports"))
      .finally(() => setLoading(false))
  }, [page, statusFilter])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6">
      <PageHeader title="User Reports" description="Review and handle user report submissions" icon={Flag} />

      {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      {/* Status summary */}
      {counts && (
        <div className="grid gap-4 md:grid-cols-4">
          {(["pending", "reviewed", "resolved", "dismissed"] as const).map((s) => (
            <Card
              key={s}
              className={`cursor-pointer transition-colors ${statusFilter === s ? "ring-2 ring-primary" : ""}`}
              onClick={() => { setStatusFilter(statusFilter === s ? "" : s); setPage(1) }}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <ReportStatusBadge status={s} />
                <span className="text-2xl font-bold">{counts[s] || 0}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex gap-2">
        <Button variant={statusFilter === "" ? "default" : "outline"} size="sm" onClick={() => { setStatusFilter(""); setPage(1) }}>
          All
        </Button>
        {statusOptions.slice(1).map((s) => (
          <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => { setStatusFilter(s); setPage(1) }}>
            {statusLabel[s]}
          </Button>
        ))}
      </div>

      {/* Report list */}
      {loading ? (
        <div>Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-muted-foreground">No reports found.</div>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <Card key={r.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push(`/reports/detail?id=${r.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <ReportStatusBadge status={r.status} />
                    </div>
                    <p className="text-sm line-clamp-2">{r.reason}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Reporter: {r.reporterName || r.reporterId.slice(0, 8)}</span>
                      <span>Target: {r.reportedName || r.reportedId.slice(0, 8)}</span>
                      <span>{typeof r.createdAt === "number" ? new Date(r.createdAt * 1000).toLocaleString() : new Date(r.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Total {total} items, page {page}/{totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
