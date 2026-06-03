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


const statusColor: Record<string, string> = {
  received: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
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

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await feedbackApi.update(id, { status, response })
      setFb(updated)
    } catch {
      // error handled by interceptor
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
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("titleId", { id: fb.id })}</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/feedback")}>
          {t("buttonBackToList")}
        </Button>
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
                <p className="text-sm font-mono">{fb.userId}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("fieldSubmitted")}</p>
                <p className="text-sm">{new Date(fb.createdAt * 1000).toLocaleString()}</p>
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

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? t("buttonSaving") : t("buttonSaveResponse")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
