"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"
import { useRouter, useSearchParams } from "next/navigation"
import { reportApi, userApi, contentApi, commentApi, characterApi } from "@/lib/api/admin"
import type { ContentReport } from "@/lib/types"
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

export default function ContentReportDetailPage() {
  const t = useTranslations("reportsContentDetail")
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get("id") || ""

  const statusLabel: Record<string, string> = {
    pending: t("statusPending"),
    reviewed: t("statusReviewed"),
    resolved: t("statusResolved"),
    dismissed: t("statusDismissed"),
  }

  const [report, setReport] = useState<ContentReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [reviewStatus, setReviewStatus] = useState("")
  const [remarks, setRemarks] = useState("")
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState("")

  useEffect(() => {
    if (!id) { router.push("/reports?tab=content"); return }
    reportApi
      .getContent(id)
      .then((data) => {
        setReport(data)
        setReviewStatus(data.status)
      })
      .catch(() => router.push("/reports?tab=content"))
      .finally(() => setLoading(false))
  }, [id, router])

  const reload = async () => {
    const data = await reportApi.getContent(id)
    setReport(data)
    setReviewStatus(data.status)
  }

  const showReviewOutcome = (updated: ContentReport) => {
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
  }

  const handleReview = async () => {
    setSaving(true)
    try {
      const updated = await reportApi.reviewContent(id, { status: reviewStatus, remarks })
      setReport(updated)
      setRemarks("")
      showReviewOutcome(updated)
    } finally {
      setSaving(false)
    }
  }

  const handleResolve = async (actions: string[]) => {
    if (!report) return
    const label = actions.includes("takedown") && actions.includes("suspend_creator")
      ? t("confirmResolveBoth")
      : actions.includes("takedown")
        ? t("confirmTakedown")
        : t("confirmSuspend")
    if (!window.confirm(label)) return

    setActionLoading(actions.join(","))
    try {
      const updated = await reportApi.resolveContent(id, {
        status: "resolved",
        remarks: remarks || t("defaultResolveRemarks"),
        actions,
      })
      setReport(updated)
      setReviewStatus(updated.status)
      setRemarks("")
      showReviewOutcome(updated)
    } finally {
      setActionLoading("")
    }
  }

  const handleTakedownOnly = async () => {
    if (!report) return
    if (!window.confirm(t("confirmTakedown"))) return
    setActionLoading("takedown-only")
    try {
      const ct = report.contentType
      if (ct === "comment") {
        await commentApi.delete(report.contentId)
      } else if (ct === "character") {
        await characterApi.action(report.contentId, { action: "force_delete" })
      } else if (["story", "storyboard", "fragment"].includes(ct)) {
        await contentApi.action(ct, report.contentId, { action: "force_delete" })
      }
      await reload()
    } finally {
      setActionLoading("")
    }
  }

  const handleSuspendCreator = async () => {
    if (!report?.creatorId) return
    if (!window.confirm(t("confirmSuspend", { name: report.creatorName || report.creatorId.slice(0, 8) }))) return
    setActionLoading("suspend-only")
    try {
      await userApi.suspend(report.creatorId)
    } finally {
      setActionLoading("")
    }
  }

  const contentAdminLink = () => {
    if (!report) return null
    const ct = report.contentType
    if (ct === "comment") return `/comments`
    if (ct === "character") return `/characters`
    if (["story", "storyboard", "fragment"].includes(ct)) {
      return `/content?contentType=${ct}`
    }
    return null
  }

  if (loading) return <PageSkeleton />
  if (!report) return null

  const adminLink = contentAdminLink()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("titleId", { id: report.id })}</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/reports?tab=content")}>
          {t("buttonBackToList")}
        </Button>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        {t("slaGuidance")}
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
                <p className="text-sm">{new Date(report.createdAt * 1000).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("fieldContentType")}</p>
                <p className="text-sm">{report.contentType}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("fieldContentId")}</p>
                <p className="text-sm font-mono text-xs break-all">{report.contentId}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("fieldReporter")}</p>
                <p className="text-sm">{report.reporterName || report.reporterId.slice(0, 8)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("fieldCreator")}</p>
                <p className="text-sm">{report.creatorName || report.creatorId?.slice(0, 8) || "—"}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">{t("fieldContentPreview")}</p>
              <div className="rounded-lg bg-muted p-4 text-sm whitespace-pre-wrap">
                {report.contentPreview || report.contentTitle || t("contentUnavailable")}
              </div>
              {report.contentDeleted && (
                <p className="text-xs text-muted-foreground mt-1">{t("contentAlreadyRemoved")}</p>
              )}
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
                    {t("reviewedBy", { by: report.reviewedBy, at: report.reviewedAt ? new Date(report.reviewedAt * 1000).toLocaleString() : "" })}
                  </p>
                )}
              </div>
            )}

            {adminLink && (
              <Link href={adminLink} className="text-sm text-primary hover:underline">
                {t("openInContentAdmin")}
              </Link>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("cardModerationActions")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{t("moderationActionsDescription")}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={!!actionLoading || report.contentDeleted}
                  onClick={() => handleTakedownOnly()}
                >
                  {actionLoading === "takedown-only" ? t("buttonWorking") : t("buttonTakedown")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!!actionLoading || !report.creatorId}
                  onClick={handleSuspendCreator}
                >
                  {actionLoading === "suspend-only" ? t("buttonWorking") : t("buttonSuspendCreator")}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  disabled={!!actionLoading}
                  onClick={() => handleResolve(["takedown", "suspend_creator"])}
                >
                  {actionLoading === "takedown,suspend_creator" ? t("buttonWorking") : t("buttonResolveBoth")}
                </Button>
              </div>
            </CardContent>
          </Card>

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
        </div>
      </div>
    </div>
  )
}
