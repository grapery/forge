"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"

import { useRouter, useSearchParams } from "next/navigation"

import { reportApi, userApi } from "@/lib/api/admin"

import type { Report } from "@/lib/types"

import { Button } from "@/components/ui/button"

import { Label } from "@/components/ui/label"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { toast } from "sonner"


const statusColor: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  reviewed: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  dismissed: "bg-gray-100 text-gray-800",
}

export default function ReportDetailPage() {
  const t = useTranslations("reportsDetail")
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get("id") || ""

  const statusLabel: Record<string, string> = {
    pending: t("statusPending"),
    reviewed: t("statusReviewed"),
    resolved: t("statusResolved"),
    dismissed: t("statusDismissed"),
  }

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
      if (updated.reporterNotified) {
        toast.success(t("toastReporterNotified"), {
          action: {
            label: t("viewReporterNotifications"),
            onClick: () => router.push(`/notifications?userId=${updated.reporterId}&type=moderation_report_resolved`),
          },
        })
      } else {
        toast.success(t("toastReviewSaved"))
      }
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
        await userApi.suspend(userId)
      } else {
        await userApi.activate(userId)
      }
      alert(`User ${action === "suspend" ? "suspended" : "activated"} successfully`)
    } catch {
      // error handled by interceptor
    } finally {
      setActionLoading("")
    }
  }

  if (loading) return <PageSkeleton />
  if (!report) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("titleId", { id: report.id })}</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/reports")}>
          {t("buttonBackToList")}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("cardReportInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">{t("fieldStatus")}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[report.status]}`}>
                    {statusLabel[report.status] || report.status}
                  </span>
                  {report.isOverdue && (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800">
                      {t("slaOverdue")}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("fieldSubmitted")}</p>
                <p className="text-sm">{typeof report.createdAt === "number" ? new Date(report.createdAt * 1000).toLocaleString() : new Date(report.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("fieldReporter")}</p>
                <p className="text-sm">{report.reporterName || report.reporterId.slice(0, 8)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("fieldReportedUser")}</p>
                <p className="text-sm">{report.reportedName || report.reportedId.slice(0, 8)}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">{t("fieldReason")}</p>
              <div className="rounded-lg bg-muted p-4 text-sm whitespace-pre-wrap">{report.reason}</div>
            </div>

            {report.reviewRemarks && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("fieldReviewRemarks")}</p>
                <div className="rounded-lg bg-muted p-4 text-sm whitespace-pre-wrap">{report.reviewRemarks}</div>
                {report.reviewedBy && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("reviewedBy", {
                      by: report.reviewedBy,
                      at: report.reviewedAt ? new Date(report.reviewedAt * 1000).toLocaleString() : "",
                    })}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("cardReviewReport")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">{t("fieldStatus")}</Label>
                <select
                  id="status"
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  <option value="pending">{t("statusPending")}</option>
                  <option value="reviewed">{t("statusReviewed")}</option>
                  <option value="resolved">{t("statusResolved")}</option>
                  <option value="dismissed">{t("statusDismissed")}</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks">{t("fieldRemarks")}</Label>
                <textarea
                  id="remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={4}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder={t("placeholderRemarks")}
                />
              </div>

              <Button onClick={handleReview} disabled={saving} className="w-full">
                {saving ? t("buttonSaving") : t("buttonSubmitReview")}
              </Button>
              {report.reporterId && (
                <Link
                  href={`/notifications?userId=${report.reporterId}&type=moderation_report_resolved`}
                  className="block text-center text-sm text-primary hover:underline"
                >
                  {t("viewReporterNotifications")}
                </Link>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("cardUserActions")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t("userActionDescription")} <span className="font-medium text-foreground">{report.reportedName || report.reportedId.slice(0, 8)}</span>
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={!!actionLoading}
                  onClick={() => handleUserAction("suspend")}
                >
                  {actionLoading === "suspend" ? t("buttonSuspending") : t("buttonSuspendUser")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!!actionLoading}
                  onClick={() => handleUserAction("activate")}
                >
                  {actionLoading === "activate" ? t("buttonActivating") : t("buttonActivateUser")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
