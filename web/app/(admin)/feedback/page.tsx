"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"
import { useRouter, useSearchParams } from "next/navigation"
import { feedbackApi } from "@/lib/api/admin"
import type { Feedback, FeedbackStatusCount } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/shared/page-header"
import { MessageSquare, Search } from "lucide-react"
import { getFeedbackSlaInfo } from "@/lib/feedback-sla"
import { LoadErrorBanner } from "@/components/shared/load-error-banner"
import { EmptyState } from "@/components/shared/empty-state"

const statusOptions = ["", "received", "processing", "resolved", "closed"]
const categoryOptions = ["", "bug", "feature", "content", "general"]

const statusColor: Record<string, string> = {
  received: "bg-[var(--status-warning-bg)] text-[var(--status-warning)]",
  processing: "bg-primary/15 text-primary",
  resolved: "bg-[var(--status-success-bg)] text-[var(--status-success)]",
  closed: "bg-gray-500/15 text-gray-400",
}

function FeedbackSlaChip({
  createdAt,
  status,
  labels,
}: {
  createdAt: number
  status: string
  labels: {
    fresh: (hours: number) => string
    aging: (hours: number) => string
    critical: (hours: number) => string
  }
}) {
  const sla = getFeedbackSlaInfo(createdAt, status)
  if (sla.kind === "critical") {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-[var(--status-danger-bg)] text-[var(--status-danger)]">
        {labels.critical(sla.ageHours)}
      </span>
    )
  }
  if (sla.kind === "aging") {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-[var(--status-warning-bg)] text-[var(--status-warning)]">
        {labels.aging(sla.ageHours)}
      </span>
    )
  }
  if (sla.kind === "fresh") {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-[var(--status-success-bg)] text-[var(--status-success)]">
        {labels.fresh(sla.ageHours)}
      </span>
    )
  }
  return null
}

export default function FeedbackPage() {
  const t = useTranslations("feedback")
  const tc = useTranslations("common")
  const router = useRouter()
  const searchParams = useSearchParams()
  const [items, setItems] = useState<Feedback[]>([])
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState<FeedbackStatusCount | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "")
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get("category") || "")
  const [userIdFilter] = useState(searchParams.get("userId") || "")
  const [keyword, setKeyword] = useState(searchParams.get("keyword") || "")
  const [keywordDraft, setKeywordDraft] = useState(searchParams.get("keyword") || "")
  const [overdueOnly, setOverdueOnly] = useState(searchParams.get("overdue") === "1")
  const pageSize = 20

  const statusLabel: Record<string, string> = {
    received: t("statusReceived"),
    processing: t("statusProcessing"),
    resolved: t("statusResolved"),
    closed: t("statusClosed"),
  }

  const categoryLabel: Record<string, string> = {
    bug: t("categoryBug"),
    feature: t("categoryFeature"),
    content: t("categoryContent"),
    general: t("categoryGeneral"),
  }

  useEffect(() => {
    feedbackApi.statusCounts().then(setCounts).catch(() => {})
  }, [])

  const fetchList = () => {
    setLoading(true)
    setError("")
    feedbackApi
      .list({
        page,
        pageSize,
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        userId: userIdFilter || undefined,
        keyword: keyword || undefined,
        overdue: overdueOnly || undefined,
      })
      .then((data) => {
        setItems(data.items || [])
        setTotal(data.total)
      })
      .catch((err) => setError(err.message || t("toastLoadFailed")))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, categoryFilter, userIdFilter, keyword, overdueOnly, t])

  const totalPages = Math.ceil(total / pageSize) || 1

  const applyKeyword = () => {
    const next = keywordDraft.trim()
    setKeyword(next)
    setPage(1)
    syncUrl({ keyword: next })
  }

  const syncUrl = (next: { overdue?: boolean; status?: string; category?: string; keyword?: string }) => {
    const params = new URLSearchParams()
    const status = next.status !== undefined ? next.status : statusFilter
    const category = next.category !== undefined ? next.category : categoryFilter
    const kw = next.keyword !== undefined ? next.keyword : keyword
    const overdue = next.overdue !== undefined ? next.overdue : overdueOnly
    if (status) params.set("status", status)
    if (category) params.set("category", category)
    if (userIdFilter) params.set("userId", userIdFilter)
    if (kw) params.set("keyword", kw)
    if (overdue) params.set("overdue", "1")
    const qs = params.toString()
    router.replace(qs ? `/feedback?${qs}` : "/feedback")
  }

  const applyStatus = (next: string) => {
    setStatusFilter(next)
    setPage(1)
    syncUrl({ status: next })
  }

  const applyCategory = (next: string) => {
    setCategoryFilter(next)
    setPage(1)
    syncUrl({ category: next })
  }

  const toggleOverdue = () => {
    const next = !overdueOnly
    let nextStatus = statusFilter
    if (next && (statusFilter === "resolved" || statusFilter === "closed")) {
      nextStatus = ""
      setStatusFilter("")
    }
    setOverdueOnly(next)
    setPage(1)
    syncUrl({ overdue: next, status: nextStatus })
  }

  const displayedItems = items
  const hasFilters = Boolean(statusFilter || categoryFilter || keyword || overdueOnly || userIdFilter)

  const clearAllFilters = () => {
    setStatusFilter("")
    setCategoryFilter("")
    setKeyword("")
    setKeywordDraft("")
    setOverdueOnly(false)
    setPage(1)
    router.replace("/feedback")
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("descriptionSla")} icon={MessageSquare} />

      {error && <LoadErrorBanner message={error} onRetry={fetchList} />}

      {counts && (
        <div className="grid gap-4 md:grid-cols-5">
          {(["received", "processing", "resolved", "closed"] as const).map((s) => (
            <Card
              key={s}
              className={`cursor-pointer transition-colors ${statusFilter === s ? "ring-2 ring-primary" : ""}`}
              onClick={() => applyStatus(statusFilter === s ? "" : s)}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[s] || "bg-gray-500/15 text-gray-400"}`}>
                  {statusLabel[s] || s}
                </span>
                <span className="text-[28px] font-medium tracking-tight">{counts[s]}</span>
              </CardContent>
            </Card>
          ))}
          <Card
            className={`cursor-pointer transition-colors ${overdueOnly ? "ring-2 ring-destructive" : ""}`}
            onClick={toggleOverdue}
          >
            <CardContent className="flex items-center gap-3 p-4">
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-[var(--status-danger-bg)] text-[var(--status-danger)]">
                {t("kpiOverdue")}
              </span>
              <div className="min-w-0">
                <span className="text-[28px] font-medium tracking-tight">{counts.overdue ?? 0}</span>
                {(counts.critical ?? 0) > 0 && (
                  <p className="text-[11px] text-[var(--status-danger)]">
                    {t("kpiCritical", { count: counts.critical ?? 0 })}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button variant={statusFilter === "" ? "default" : "outline"} size="sm" onClick={() => applyStatus("")}>
            {t("filterAll")}
          </Button>
          {statusOptions.slice(1).map((s) => (
            <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => applyStatus(s)}>
              {statusLabel[s]}
            </Button>
          ))}
          <Button
            variant={overdueOnly ? "destructive" : "outline"}
            size="sm"
            onClick={toggleOverdue}
          >
            {t("filterOverdue")}
          </Button>
        </div>
        <div className="flex gap-2">
          <Input
            value={keywordDraft}
            onChange={(e) => setKeywordDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") applyKeyword() }}
            placeholder={t("searchPlaceholder")}
            className="h-9 w-56"
          />
          <Button variant="outline" size="sm" onClick={applyKeyword}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={categoryFilter === "" ? "secondary" : "outline"} size="sm" onClick={() => applyCategory("")}>
          {t("filterAllCategories")}
        </Button>
        {categoryOptions.slice(1).map((c) => (
          <Button key={c} variant={categoryFilter === c ? "secondary" : "outline"} size="sm" onClick={() => applyCategory(c)}>
            {categoryLabel[c] || c}
          </Button>
        ))}
        {userIdFilter && (
          <Button variant="outline" size="sm" onClick={() => router.push("/feedback")}>
            {t("clearUserFilter")}
          </Button>
        )}
      </div>

      {loading ? (
        <PageSkeleton />
      ) : displayedItems.length === 0 ? (
        <EmptyState
          title={overdueOnly ? t("noOverdueFound") : hasFilters ? tc("emptyFilteredTitle") : t("noFeedbackFound")}
          description={hasFilters && !overdueOnly ? tc("emptyFilteredDescription") : undefined}
          actionLabel={hasFilters ? tc("clearFilters") : undefined}
          onAction={hasFilters ? clearAllFilters : undefined}
        />
      ) : (
        <div className="space-y-3">
          {overdueOnly && (
            <p className="text-xs text-[var(--status-warning)]">{t("overdueFilterActive", { total })}</p>
          )}
          {displayedItems.map((fb) => (
            <Card key={fb.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push(`/feedback/detail?id=${fb.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[fb.status] || "bg-gray-500/15 text-gray-400"}`}>
                        {statusLabel[fb.status] || fb.status}
                      </span>
                      <FeedbackSlaChip
                        createdAt={fb.createdAt}
                        status={fb.status}
                        labels={{
                          fresh: (h) => t("slaFresh", { hours: h }),
                          aging: (h) => t("slaAging", { hours: h }),
                          critical: (h) => t("slaCritical", { hours: h }),
                        }}
                      />
                      <span className="text-xs text-muted-foreground">{categoryLabel[fb.category] || fb.category}</span>
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/users/detail?id=${fb.userId}`)
                        }}
                      >
                        {fb.userName || fb.userId}
                      </button>
                    </div>
                    <p className="text-sm line-clamp-2">{fb.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(fb.createdAt * 1000).toLocaleString()}
                    </p>
                  </div>
                  {fb.response && (
                    <span className="shrink-0 text-xs text-[var(--status-success)] font-medium">{t("labelReplied")}</span>
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
