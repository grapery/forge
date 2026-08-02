"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"
import { useRouter, useSearchParams } from "next/navigation"
import { reportApi, blockApi } from "@/lib/api/admin"
import type { Report, ContentReport, UserBlock, BlockCounts, ModerationSummary } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"
import { Input } from "@/components/ui/input"
import { Flag, ShieldAlert, Search, Inbox, Clock } from "lucide-react"
import { StatCard } from "@/components/shared/stat-card"
import { getReportSlaInfo } from "@/lib/report-sla"
import { LoadErrorBanner } from "@/components/shared/load-error-banner"
import { EmptyState } from "@/components/shared/empty-state"

type Tab = "users" | "content" | "blocks"

const statusOptions = ["", "pending", "reviewed", "resolved", "dismissed"]

const statusColor: Record<string, string> = {
  pending: "bg-[var(--status-warning-bg)] text-[var(--status-warning)]",
  reviewed: "bg-[var(--status-info-bg)] text-[var(--status-info)]",
  resolved: "bg-green-500/15 text-[var(--status-success)]",
  dismissed: "bg-gray-500/15 text-gray-400",
}

const contentTypes = ["", "storyboard", "fragment", "comment", "story", "character"]

function formatTime(ts: number) {
  return new Date(ts * 1000).toLocaleString()
}

function SlaChip({ createdAt, status, isOverdue, remainingLabel, overdueLabel }: {
  createdAt: number
  status: string
  isOverdue?: boolean
  remainingLabel: (hours: number) => string
  overdueLabel: (hours: number) => string
}) {
  const sla = getReportSlaInfo(createdAt, status)
  if (sla.kind === "overdue" || isOverdue) {
    const hours = sla.kind === "overdue" ? sla.overdueHours : Math.max(1, sla.ageHours - 24)
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-[var(--status-danger-bg)] text-[var(--status-danger)]">
        {overdueLabel(hours)}
      </span>
    )
  }
  if (sla.kind === "remaining") {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-[var(--status-warning-bg)] text-[var(--status-warning)]">
        {remainingLabel(sla.remainingHours)}
      </span>
    )
  }
  return null
}

export default function ReportsPage() {
  const t = useTranslations("reports")
  const tc = useTranslations("common")
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = (searchParams.get("tab") as Tab) || "users"

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [reloadToken, setReloadToken] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "")
  const [overdueOnly, setOverdueOnly] = useState(searchParams.get("overdue") === "1")
  const [contentTypeFilter, setContentTypeFilter] = useState(searchParams.get("contentType") || "")
  const [blockSearch, setBlockSearch] = useState("")
  const [keywordDraft, setKeywordDraft] = useState(searchParams.get("keyword") || "")
  const [keyword, setKeyword] = useState(searchParams.get("keyword") || "")
  const pageSize = 20

  const [summary, setSummary] = useState<ModerationSummary | null>(null)
  const [userItems, setUserItems] = useState<Report[]>([])
  const [userTotal, setUserTotal] = useState(0)
  const [userCounts, setUserCounts] = useState<Record<string, number> | null>(null)

  const [contentItems, setContentItems] = useState<ContentReport[]>([])
  const [contentTotal, setContentTotal] = useState(0)
  const [contentCounts, setContentCounts] = useState<Record<string, number> | null>(null)

  const [blockItems, setBlockItems] = useState<UserBlock[]>([])
  const [blockTotal, setBlockTotal] = useState(0)
  const [blockCounts, setBlockCounts] = useState<BlockCounts | null>(null)
  const [countsError, setCountsError] = useState("")

  const statusLabel: Record<string, string> = {
    pending: t("statusPending"),
    reviewed: t("statusReviewed"),
    resolved: t("statusResolved"),
    dismissed: t("statusDismissed"),
  }

  const setTab = (next: Tab) => {
    setPage(1)
    setStatusFilter("")
    setOverdueOnly(false)
    setContentTypeFilter("")
    setBlockSearch("")
    setKeyword("")
    setKeywordDraft("")
    router.push(`/reports?tab=${next}`)
  }

  const syncUrl = (next: {
    tab?: Tab
    status?: string
    overdue?: boolean
    keyword?: string
    contentType?: string
  }) => {
    const params = new URLSearchParams()
    const nextTab = next.tab ?? tab
    const status = next.status !== undefined ? next.status : statusFilter
    const overdue = next.overdue !== undefined ? next.overdue : overdueOnly
    const kw = next.keyword !== undefined ? next.keyword : keyword
    const contentType = next.contentType !== undefined ? next.contentType : contentTypeFilter
    params.set("tab", nextTab)
    if (status) params.set("status", status)
    if (overdue) params.set("overdue", "1")
    if (kw) params.set("keyword", kw)
    if (nextTab === "content" && contentType) params.set("contentType", contentType)
    router.replace(`/reports?${params.toString()}`)
  }

  const applyStatus = (next: string) => {
    setStatusFilter(next)
    setOverdueOnly(false)
    setPage(1)
    syncUrl({ status: next, overdue: false })
  }

  const applyKeyword = () => {
    const next = keywordDraft.trim()
    setKeyword(next)
    setPage(1)
    syncUrl({ keyword: next })
  }

  const toggleOverdue = () => {
    const next = !overdueOnly
    setOverdueOnly(next)
    if (next) setStatusFilter("pending")
    setPage(1)
    syncUrl({ overdue: next, status: next ? "pending" : statusFilter })
  }

  useEffect(() => {
    reportApi.moderationSummary().then(setSummary).catch(() => setSummary(null))
  }, [])

  useEffect(() => {
    setCountsError("")
    if (tab === "users") {
      reportApi.statusCounts().then((c) => setUserCounts({
        pending: c.pending,
        reviewed: c.reviewed,
        resolved: c.resolved,
        dismissed: c.dismissed,
        overdue: c.overdue,
      })).catch((err: Error) => {
        setUserCounts(null)
        setCountsError(err.message || t("countsLoadFailed"))
      })
    } else if (tab === "content") {
      reportApi.contentStatusCounts().then(setContentCounts).catch((err: Error) => {
        setContentCounts(null)
        setCountsError(err.message || t("countsLoadFailed"))
      })
    } else {
      blockApi.counts().then(setBlockCounts).catch((err: Error) => {
        setBlockCounts(null)
        setCountsError(err.message || t("countsLoadFailed"))
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  useEffect(() => {
    setLoading(true)
    setError("")
    const load = async () => {
      try {
        if (tab === "users") {
          const data = await reportApi.list({
            page,
            pageSize,
            status: overdueOnly ? undefined : (statusFilter || undefined),
            overdue: overdueOnly || undefined,
            keyword: keyword || undefined,
          })
          setUserItems(data.items || [])
          setUserTotal(data.total)
        } else if (tab === "content") {
          const data = await reportApi.listContent({
            page,
            pageSize,
            status: overdueOnly ? undefined : (statusFilter || undefined),
            contentType: contentTypeFilter || undefined,
            overdue: overdueOnly || undefined,
            keyword: keyword || undefined,
          })
          setContentItems(data.items || [])
          setContentTotal(data.total)
        } else {
          const data = await blockApi.list({
            page,
            pageSize,
            search: blockSearch || undefined,
          })
          setBlockItems(data.items || [])
          setBlockTotal(data.total)
        }
      } catch (err: any) {
        setError(err.message || t("toastLoadFailed"))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tab, page, statusFilter, contentTypeFilter, blockSearch, overdueOnly, keyword, t, reloadToken])

  const reloadList = () => setReloadToken((n) => n + 1)

  const total = tab === "users" ? userTotal : tab === "content" ? contentTotal : blockTotal
  const totalPages = Math.ceil(total / pageSize) || 1
  const hasListFilters = Boolean(statusFilter || overdueOnly || keyword || contentTypeFilter || blockSearch)

  const clearListFilters = () => {
    setStatusFilter("")
    setOverdueOnly(false)
    setKeyword("")
    setKeywordDraft("")
    setContentTypeFilter("")
    setBlockSearch("")
    setPage(1)
    syncUrl({ status: "", overdue: false, keyword: "", contentType: "" })
  }

  const contentTypeLabel = (type: string) => {
    const key = `contentType_${type}` as const
    try {
      return t(key)
    } catch {
      return type
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} icon={Flag} />

      {summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <button
            type="button"
            className="text-left"
            onClick={() => {
              setPage(1)
              setStatusFilter("pending")
              setOverdueOnly(false)
              setKeyword("")
              setKeywordDraft("")
              syncUrl({ tab: "users", status: "pending", overdue: false, keyword: "" })
            }}
          >
            <StatCard title={t("summaryPendingUsers")} value={summary.pendingUserReports} icon={Inbox} />
          </button>
          <button
            type="button"
            className="text-left"
            onClick={() => {
              setPage(1)
              setStatusFilter("pending")
              setOverdueOnly(false)
              setKeyword("")
              setKeywordDraft("")
              syncUrl({ tab: "content", status: "pending", overdue: false, keyword: "" })
            }}
          >
            <StatCard title={t("summaryPendingContent")} value={summary.pendingContentReports} icon={Flag} />
          </button>
          <button
            type="button"
            className="text-left"
            onClick={() => {
              const nextTab = summary.pendingUserReports > 0 || tab === "users" ? "users" : "content"
              setPage(1)
              setStatusFilter("pending")
              setOverdueOnly(true)
              setContentTypeFilter("")
              setKeyword("")
              setKeywordDraft("")
              syncUrl({ tab: nextTab, status: "pending", overdue: true, keyword: "" })
            }}
          >
            <StatCard title={t("summaryOverdueTotal")} value={summary.overdueTotal} icon={Clock} />
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {(["users", "content", "blocks"] as Tab[]).map((key) => (
          <Button
            key={key}
            variant={tab === key ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(key)}
          >
            {t(`tab_${key}`)}
          </Button>
        ))}
      </div>

      {error && <LoadErrorBanner message={error} onRetry={reloadList} />}
      {countsError && (
        <LoadErrorBanner message={`${countsError} — ${t("countsLoadHint")}`} />
      )}

      {tab !== "blocks" && (userCounts || contentCounts) && (
        <div className="grid gap-4 md:grid-cols-5">
          {(["pending", "reviewed", "resolved", "dismissed"] as const).map((s) => {
            const counts = tab === "users" ? userCounts : contentCounts
            return (
              <Card
                key={s}
                className={`cursor-pointer transition-colors ${!overdueOnly && statusFilter === s ? "ring-2 ring-primary" : ""}`}
                onClick={() => applyStatus(statusFilter === s ? "" : s)}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[s]}`}>
                    {statusLabel[s]}
                  </span>
                  <span className="text-[28px] font-medium tracking-tight">{counts?.[s] || 0}</span>
                </CardContent>
              </Card>
            )
          })}
          <Card
            className={`cursor-pointer border-[var(--status-danger)]/20 bg-[var(--status-danger-bg)] transition-colors ${overdueOnly ? "ring-2 ring-[var(--status-danger)]" : ""}`}
            onClick={toggleOverdue}
          >
            <CardContent className="flex items-center gap-3 p-4">
              <ShieldAlert className="h-4 w-4 text-[var(--status-danger)]" />
              <div>
                <p className="text-xs text-[var(--status-danger)]">{t("slaOverdue")}</p>
                <span className="text-[28px] font-medium tracking-tight text-[var(--status-danger)]">
                  {(tab === "users" ? userCounts?.overdue : contentCounts?.overdue) || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "blocks" && blockCounts && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{t("blocksTotal")}</p>
              <span className="text-[28px] font-medium tracking-tight">{blockCounts.total}</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{t("blocksLast7Days")}</p>
              <span className="text-[28px] font-medium tracking-tight">{blockCounts.last7Days}</span>
            </CardContent>
          </Card>
        </div>
      )}

      {tab !== "blocks" && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={!overdueOnly && statusFilter === "" ? "default" : "outline"}
              size="sm"
              onClick={() => applyStatus("")}
            >
              {t("filterAll")}
            </Button>
            {statusOptions.slice(1).map((s) => (
              <Button
                key={s}
                variant={!overdueOnly && statusFilter === s ? "default" : "outline"}
                size="sm"
                onClick={() => applyStatus(s)}
              >
                {statusLabel[s]}
              </Button>
            ))}
            <Button variant={overdueOnly ? "destructive" : "outline"} size="sm" onClick={toggleOverdue}>
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
      )}

      {tab === "content" && (
        <div className="flex flex-wrap gap-2">
          {contentTypes.map((ct) => (
            <Button
              key={ct || "all"}
              variant={contentTypeFilter === ct ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setContentTypeFilter(ct)
                setPage(1)
                syncUrl({ contentType: ct })
              }}
            >
              {ct ? contentTypeLabel(ct) : t("filterAllTypes")}
            </Button>
          ))}
        </div>
      )}

      {tab === "blocks" && (
        <div className="flex gap-2 max-w-md">
          <Input
            placeholder={t("blocksSearchPlaceholder")}
            value={blockSearch}
            onChange={(e) => setBlockSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setPage(1)}
          />
          <Button variant="outline" onClick={() => setPage(1)}>{t("blocksSearch")}</Button>
        </div>
      )}

      {loading ? (
        <PageSkeleton />
      ) : tab === "users" ? (
        userItems.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={hasListFilters ? tc("emptyFilteredTitle") : t("noReportsFound")}
            description={hasListFilters ? tc("emptyFilteredDescription") : undefined}
            actionLabel={hasListFilters ? tc("clearFilters") : undefined}
            onAction={hasListFilters ? clearListFilters : undefined}
          />
        ) : (
          <div className="space-y-3">
            {userItems.map((r) => (
              <Card key={r.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push(`/reports/detail?id=${r.id}`)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[r.status]}`}>
                          {statusLabel[r.status] || r.status}
                        </span>
                        <SlaChip
                          createdAt={r.createdAt}
                          status={r.status}
                          isOverdue={r.isOverdue}
                          remainingLabel={(hours) => t("slaRemaining", { hours })}
                          overdueLabel={(hours) => t("slaOverdueBy", { hours })}
                        />
                      </div>
                      <p className="text-sm line-clamp-2">{r.reason}</p>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <button
                          type="button"
                          className="hover:text-primary hover:underline"
                          onClick={(e) => { e.stopPropagation(); router.push(`/users/detail?id=${r.reporterId}`) }}
                        >
                          {t("columnReporter")}: {r.reporterName || r.reporterId.slice(0, 8)}
                        </button>
                        <button
                          type="button"
                          className="hover:text-primary hover:underline"
                          onClick={(e) => { e.stopPropagation(); router.push(`/users/detail?id=${r.reportedId}`) }}
                        >
                          {t("columnTarget")}: {r.reportedName || r.reportedId.slice(0, 8)}
                        </button>
                        <span>{formatTime(r.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : tab === "content" ? (
        contentItems.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={hasListFilters ? tc("emptyFilteredTitle") : t("noContentReportsFound")}
            description={hasListFilters ? tc("emptyFilteredDescription") : undefined}
            actionLabel={hasListFilters ? tc("clearFilters") : undefined}
            onAction={hasListFilters ? clearListFilters : undefined}
          />
        ) : (
          <div className="space-y-3">
            {contentItems.map((r) => (
              <Card key={r.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push(`/reports/content-detail?id=${r.id}`)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-medium text-muted-foreground">{contentTypeLabel(r.contentType)}</span>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[r.status]}`}>
                          {statusLabel[r.status] || r.status}
                        </span>
                        <SlaChip
                          createdAt={r.createdAt}
                          status={r.status}
                          isOverdue={r.isOverdue}
                          remainingLabel={(hours) => t("slaRemaining", { hours })}
                          overdueLabel={(hours) => t("slaOverdueBy", { hours })}
                        />
                        {r.contentDeleted && (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-500/15 text-gray-400">
                            {t("contentRemoved")}
                          </span>
                        )}
                      </div>
                      <p className="text-sm line-clamp-2">{r.contentPreview || r.contentTitle || r.reason}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{t("reportReason")}: {r.reason}</p>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <button
                          type="button"
                          className="hover:text-primary hover:underline"
                          onClick={(e) => { e.stopPropagation(); router.push(`/users/detail?id=${r.reporterId}`) }}
                        >
                          {t("columnReporter")}: {r.reporterName || r.reporterId.slice(0, 8)}
                        </button>
                        {r.creatorId ? (
                          <button
                            type="button"
                            className="hover:text-primary hover:underline"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/users/detail?id=${r.creatorId}`)
                            }}
                          >
                            {t("columnCreator")}: {r.creatorName || r.creatorId.slice(0, 8)}
                          </button>
                        ) : (
                          <span>{t("columnCreator")}: —</span>
                        )}
                        <span>{formatTime(r.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : blockItems.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={hasListFilters ? tc("emptyFilteredTitle") : t("noBlocksFound")}
          description={hasListFilters ? tc("emptyFilteredDescription") : undefined}
          actionLabel={hasListFilters ? tc("clearFilters") : undefined}
          onAction={hasListFilters ? clearListFilters : undefined}
        />
      ) : (
        <div className="space-y-3">
          {blockItems.map((b) => (
            <Card key={b.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <span>{t("columnBlocker")}: <strong>{b.blockerName || b.blockerId.slice(0, 8)}</strong></span>
                  <span className="text-muted-foreground">→</span>
                  <span>{t("columnBlocked")}: <strong>{b.blockedName || b.blockedId.slice(0, 8)}</strong></span>
                  <span className="text-xs text-muted-foreground ml-auto">{formatTime(b.createdAt)}</span>
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
