"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { reportApi } from "@/lib/api/admin"
import type { Report } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const statusLabel: Record<string, string> = {
  pending: "Pending",
  reviewing: "Reviewing",
  resolved: "Resolved",
  dismissed: "Dismissed",
}

const statusColor: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  reviewing: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  dismissed: "bg-gray-100 text-gray-800",
}

export default function ReportDetailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get("id") || ""

  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [reviewStatus, setReviewStatus] = useState("")
  const [remarks, setRemarks] = useState("")
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState("")

  useEffect(() => {
    if (!id) { router.push("/reports"); return }
    reportApi
      .get(id)
      .then((data) => {
        setReport(data)
        setReviewStatus(data.status)
      })
      .catch(() => router.push("/reports"))
      .finally(() => setLoading(false))
  }, [id, router])

  const handleReview = async () => {
    setSaving(true)
    try {
      const updated = await reportApi.review(id, { status: reviewStatus, remarks })
      setReport(updated)
      setRemarks("")
    } catch {
      // error handled by interceptor
    } finally {
      setSaving(false)
    }
  }

  const handleUserAction = async (action: "suspend" | "activate") => {
    if (!report) return
    const userId = report.reportedId
    const confirmed = window.confirm(
      action === "suspend"
        ? `Suspend user ${report.reportedName || userId.slice(0, 8)}?`
        : `Activate user ${report.reportedName || userId.slice(0, 8)}?`
    )
    if (!confirmed) return

    setActionLoading(action)
    try {
      if (action === "suspend") {
        await reportApi.suspendUser(userId)
      } else {
        await reportApi.activateUser(userId)
      }
      alert(`User ${action === "suspend" ? "suspended" : "activated"} successfully`)
    } catch {
      // error handled by interceptor
    } finally {
      setActionLoading("")
    }
  }

  if (loading) return <div>Loading...</div>
  if (!report) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Report Detail</h1>
          <p className="text-muted-foreground">ID: {report.id}</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/reports")}>
          Back to List
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Report info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Report Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[report.status]}`}>
                  {statusLabel[report.status] || report.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Submitted</p>
                <p className="text-sm">{new Date(report.createdAt * 1000).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reporter</p>
                <p className="text-sm">{report.reporterName || report.reporterId.slice(0, 8)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reported User</p>
                <p className="text-sm">{report.reportedName || report.reportedId.slice(0, 8)}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Reason</p>
              <div className="rounded-lg bg-muted p-4 text-sm whitespace-pre-wrap">{report.reason}</div>
            </div>
          </CardContent>
        </Card>

        {/* Review & actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Review Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  <option value="pending">Pending</option>
                  <option value="reviewing">Reviewing</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <textarea
                  id="remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={4}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Internal remarks for this review..."
                />
              </div>

              <Button onClick={handleReview} disabled={saving} className="w-full">
                {saving ? "Saving..." : "Submit Review"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">User Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Take action against reported user: <span className="font-medium text-foreground">{report.reportedName || report.reportedId.slice(0, 8)}</span>
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={!!actionLoading}
                  onClick={() => handleUserAction("suspend")}
                >
                  {actionLoading === "suspend" ? "Suspending..." : "Suspend User"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!!actionLoading}
                  onClick={() => handleUserAction("activate")}
                >
                  {actionLoading === "activate" ? "Activating..." : "Activate User"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
