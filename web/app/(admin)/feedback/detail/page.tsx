"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"
import { useRouter, useSearchParams } from "next/navigation"
import { feedbackApi } from "@/lib/api/admin"
import type { Feedback } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { getFeedbackSlaInfo } from "@/lib/feedback-sla"

const statusColor: Record<string, string> = {
  received: "bg-[var(--status-warning-bg)] text-[var(--status-warning)]",
  processing: "bg-primary/15 text-primary",
  resolved: "bg-[var(--status-success-bg)] text-[var(--status-success)]",
  closed: "bg-gray-500/15 text-gray-400",
}

export default function FeedbackDetailPage() {
  const t = useTranslations("feedbackDetail")
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get("id") || ""

  const [fb, setFb] = useState<Feedback | null>(null)
  const [loading, setLoading] = useState(true)
  const [response, setResponse] = useState("")
  const [status, setStatus] = useState("")
  const [saving, setSaving] = useState(false)

  const statusLabel: Record<string, string> = {
    received: t("statusReceived"),
    processing: t("statusProcessing"),
    resolved: t("statusResolved"),
    closed: t("statusClosed"),
  }

  useEffect(() => {
    if (!id) { router.push("/feedback"); return }
    feedbackApi
      .get(id)
      .then((data) => {
        setFb(data)
        setResponse(data.response || "")
        setStatus(data.status)
      })
      .catch(() => router.push("/feedback"))
      .finally(() => setLoading(false))
  }, [id, router])

  const handleSave = async (overrideStatus?: string) => {
    const nextStatus = overrideStatus || status
    setSaving(true)
    try {
      const updated = await feedbackApi.update(id, { status: nextStatus, response })
      setFb(updated)
      setStatus(updated.status)
      setResponse(updated.response || "")
      if (updated.userNotified) {
        toast.success(t("toastSavedAndNotified"))
      } else {
        toast.success(t("toastSaved"))
      }
    } catch (err: any) {
      toast.error(err?.message || t("toastSaveFailed"))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageSkeleton />
  if (!fb) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-medium tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("titleId", { id: fb.id })}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push("/feedback")}>
            {t("buttonBackToList")}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              const params = new URLSearchParams({
                compose: "1",
                userId: fb.userId,
                type: "feedback_response",
                link: `/settings/feedback?id=${fb.id}`,
              })
              if (response.trim()) {
                params.set("content", response.trim())
                params.set("title", t("composeDefaultTitle"))
              }
              router.push(`/notifications?${params.toString()}`)
            }}
          >
            {t("buttonComposeNotify")}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("cardFeedbackContent")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">{t("fieldCategory")}</p>
                <p className="text-sm font-medium">{fb.category}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("fieldStatus")}</p>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[fb.status]}`}>
                  {statusLabel[fb.status] || fb.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("fieldUserId")}</p>
                <button
                  type="button"
                  className="text-sm font-medium text-primary hover:underline"
                  onClick={() => router.push(`/users/detail?id=${fb.userId}`)}
                >
                  {fb.userName || fb.userId}
                </button>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">{fb.userId}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("fieldSubmitted")}</p>
                <p className="text-sm">{new Date(fb.createdAt * 1000).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("fieldSla")}</p>
                {(() => {
                  const sla = getFeedbackSlaInfo(fb.createdAt, fb.status)
                  const text =
                    sla.kind === "critical"
                      ? t("slaCritical", { hours: sla.ageHours })
                      : sla.kind === "aging"
                        ? t("slaAging", { hours: sla.ageHours })
                        : sla.kind === "fresh"
                          ? t("slaFresh", { hours: sla.ageHours })
                          : t("slaClosed", { hours: sla.ageHours })
                  const color =
                    sla.kind === "critical"
                      ? "bg-[var(--status-danger-bg)] text-[var(--status-danger)]"
                      : sla.kind === "aging"
                        ? "bg-[var(--status-warning-bg)] text-[var(--status-warning)]"
                        : sla.kind === "fresh"
                          ? "bg-[var(--status-success-bg)] text-[var(--status-success)]"
                          : "bg-muted text-muted-foreground"
                  return (
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-1 ${color}`}>
                      {text}
                    </span>
                  )
                })()}
              </div>
            </div>

            {fb.contactInfo && (
              <div>
                <p className="text-xs text-muted-foreground">{t("fieldContactInfo")}</p>
                <p className="text-sm">{fb.contactInfo}</p>
              </div>
            )}

            <div>
              <p className="text-xs text-muted-foreground mb-1">{t("fieldContent")}</p>
              <div className="rounded-lg bg-muted p-4 text-sm whitespace-pre-wrap">{fb.content}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("cardAdminResponse")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">{t("notifyHint")}</p>
            <div className="space-y-2">
              <Label htmlFor="status">{t("fieldStatus")}</Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="received">{t("statusReceived")}</option>
                <option value="processing">{t("statusProcessing")}</option>
                <option value="resolved">{t("statusResolved")}</option>
                <option value="closed">{t("statusClosed")}</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="response">{t("fieldResponse")}</Label>
              <textarea
                id="response"
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={6}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder={t("placeholderResponse")}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled={saving}
                onClick={() => void handleSave("resolved")}
              >
                {t("buttonResolveAndSave")}
              </Button>
              <Button onClick={() => void handleSave()} disabled={saving} className="flex-1">
                {saving ? t("buttonSaving") : t("buttonSaveResponse")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
