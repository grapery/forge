"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"

import { useRouter, useSearchParams } from "next/navigation"

import { feedbackApi } from "@/lib/api/admin"

import type { Feedback, FeedbackStatusCount } from "@/lib/types"

import { Button } from "@/components/ui/button"

import { Card, CardContent } from "@/components/ui/card"

import { PageHeader } from "@/components/shared/page-header"

import { MessageSquare } from "lucide-react"


const statusOptions = ["", "received", "processing", "resolved", "closed"]

const statusColor: Record<string, string> = {
  received: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
}

export default function FeedbackPage() {
  const t = useTranslations("feedback")
  const router = useRouter()
  const searchParams = useSearchParams()
  const [items, setItems] = useState<Feedback[]>([])
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState<FeedbackStatusCount | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "")
  const pageSize = 20

  const statusLabel: Record<string, string> = {
    received: t("statusReceived"),
    processing: t("statusProcessing"),
    resolved: t("statusResolved"),
    closed: t("statusClosed"),
  }

  useEffect(() => {
    feedbackApi.statusCounts().then(setCounts).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setError("")
    feedbackApi
      .list({ page, pageSize, status: statusFilter })
      .then((data) => {
        setItems(data.items || [])
        setTotal(data.total)
      })
      .catch((err) => setError(err.message || "Failed to load feedback"))
      .finally(() => setLoading(false))
  }, [page, statusFilter])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} icon={MessageSquare} />

      {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      {counts && (
        <div className="grid gap-4 md:grid-cols-4">
          {(["received", "processing", "resolved", "closed"] as const).map((s) => (
            <Card
              key={s}
              className={`cursor-pointer transition-colors ${statusFilter === s ? "ring-2 ring-primary" : ""}`}
              onClick={() => { setStatusFilter(statusFilter === s ? "" : s); setPage(1) }}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[s] || "bg-gray-100 text-gray-800"}`}>
                  {statusLabel[s] || s}
                </span>
                <span className="text-2xl font-bold">{counts[s]}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant={statusFilter === "" ? "default" : "outline"} size="sm" onClick={() => { setStatusFilter(""); setPage(1) }}>
          {t("filterAll")}
        </Button>
        {statusOptions.slice(1).map((s) => (
          <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => { setStatusFilter(s); setPage(1) }}>
            {statusLabel[s]}
          </Button>
        ))}
      </div>

      {loading ? (
        <PageSkeleton />
      ) : items.length === 0 ? (
        <div className="text-muted-foreground">{t("noFeedbackFound")}</div>
      ) : (
        <div className="space-y-3">
          {items.map((fb) => (
            <Card key={fb.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push(`/feedback/detail?id=${fb.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[fb.status] || "bg-gray-100 text-gray-800"}`}>
                        {statusLabel[fb.status] || fb.status}
                      </span>
                      <span className="text-xs text-muted-foreground">{fb.category}</span>
                    </div>
                    <p className="text-sm line-clamp-2">{fb.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(fb.createdAt * 1000).toLocaleString()}
                    </p>
                  </div>
                  {fb.response && (
                    <span className="shrink-0 text-xs text-green-600 font-medium">{t("labelReplied")}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t("paginationInfo", { total, page, totalPages })}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              {t("buttonPrevious")}
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              {t("buttonNext")}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
