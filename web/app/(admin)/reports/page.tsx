"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"
import { useRouter, useSearchParams } from "next/navigation"
import { reportApi, blockApi } from "@/lib/api/admin"
import type { Report, ContentReport, UserBlock, BlockCounts } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"
import { Input } from "@/components/ui/input"
import { Flag, ShieldAlert } from "lucide-react"

type Tab = "users" | "content" | "blocks"

const statusOptions = ["", "pending", "reviewed", "resolved", "dismissed"]

const statusColor: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  reviewed: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  dismissed: "bg-gray-100 text-gray-800",
}

const contentTypes = ["", "storyboard", "fragment", "comment", "story", "character"]

function formatTime(ts: number) {
  return new Date(ts * 1000).toLocaleString()
}

export default function ReportsPage() {
  const t = useTranslations("reports")
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = (searchParams.get("tab") as Tab) || "users"

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState("")
  const [contentTypeFilter, setContentTypeFilter] = useState("")
  const [blockSearch, setBlockSearch] = useState("")
  const pageSize = 20

  const [userItems, setUserItems] = useState<Report[]>([])
  const [userTotal, setUserTotal] = useState(0)
  const [userCounts, setUserCounts] = useState<Record<string, number> | null>(null)

  const [contentItems, setContentItems] = useState<ContentReport[]>([])
  const [contentTotal, setContentTotal] = useState(0)
  const [contentCounts, setContentCounts] = useState<Record<string, number> | null>(null)

  const [blockItems, setBlockItems] = useState<UserBlock[]>([])
  const [blockTotal, setBlockTotal] = useState(0)
  const [blockCounts, setBlockCounts] = useState<BlockCounts | null>(null)

  const statusLabel: Record<string, string> = {
    pending: t("statusPending"),
    reviewed: t("statusReviewed"),
    resolved: t("statusResolved"),
    dismissed: t("statusDismissed"),
  }

  const setTab = (next: Tab) => {
    setPage(1)
    setStatusFilter("")
    setContentTypeFilter("")
    setBlockSearch("")
    router.push(`/reports?tab=${next}`)
  }

  useEffect(() => {
    if (tab === "users") {
      reportApi.statusCounts().then((c) => setUserCounts({
        pending: c.pending,
        reviewed: c.reviewed,
        resolved: c.resolved,
        dismissed: c.dismissed,
        overdue: c.overdue,
      })).catch(() => {})
    } else if (tab === "content") {
      reportApi.contentStatusCounts().then(setContentCounts).catch(() => {})
    } else {
      blockApi.counts().then(setBlockCounts).catch(() => {})
    }
  }, [tab])

  useEffect(() => {
    setLoading(true)
    setError("")
    const load = async () => {
      try {
        if (tab === "users") {
          const data = await reportApi.list({ page, pageSize, status: statusFilter })
          setUserItems(data.items || [])
          setUserTotal(data.total)
        } else if (tab === "content") {
          const data = await reportApi.listContent({
            page,
            pageSize,
            status: statusFilter,
            contentType: contentTypeFilter || undefined,
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
  }, [tab, page, statusFilter, contentTypeFilter, blockSearch, t])

  const total = tab === "users" ? userTotal : tab === "content" ? contentTotal : blockTotal
  const totalPages = Math.ceil(total / pageSize)

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

      {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      {tab !== "blocks" && (userCounts || contentCounts) && (
        <div className="grid gap-4 md:grid-cols-5">
          {(["pending", "reviewed", "resolved", "dismissed"] as const).map((s) => {
            const counts = tab === "users" ? userCounts : contentCounts
            return (
              <Card
                key={s}
                className={`cursor-pointer transition-colors ${statusFilter === s ? "ring-2 ring-primary" : ""}`}
                onClick={() => { setStatusFilter(statusFilter === s ? "" : s); setPage(1) }}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[s]}`}>
                    {statusLabel[s]}
                  </span>
                  <span className="text-2xl font-bold">{counts?.[s] || 0}</span>
                </CardContent>
              </Card>
            )
          })}
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="flex items-center gap-3 p-4">
              <ShieldAlert className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-xs text-red-700">{t("slaOverdue")}</p>
                <span className="text-2xl font-bold text-red-700">
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
              <span className="text-2xl font-bold">{blockCounts.total}</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{t("blocksLast7Days")}</p>
              <span className="text-2xl font-bold">{blockCounts.last7Days}</span>
            </CardContent>
          </Card>
        </div>
      )}

      {tab !== "blocks" && (
        <div className="flex flex-wrap gap-2">
          <Button variant={statusFilter === "" ? "default" : "outline"} size="sm" onClick={() => { setStatusFilter(""); setPage(1) }}>
            {t("filterAll")}
          </Button>
          {statusOptions.slice(1).map((s) => (
            <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => { setStatusFilter(s); setPage(1) }}>
              {statusLabel[s]}
            </Button>
          ))}
        </div>
      )}

      {tab === "content" && (
        <div className="flex flex-wrap gap-2">
          {contentTypes.map((ct) => (
            <Button
              key={ct || "all"}
              variant={contentTypeFilter === ct ? "default" : "outline"}
              size="sm"
              onClick={() => { setContentTypeFilter(ct); setPage(1) }}
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
          <div className="text-muted-foreground">{t("noReportsFound")}</div>
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
                        {r.isOverdue && (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800">
                            {t("slaOverdue")}
                          </span>
                        )}
                      </div>
                      <p className="text-sm line-clamp-2">{r.reason}</p>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{t("columnReporter")}: {r.reporterName || r.reporterId.slice(0, 8)}</span>
                        <span>{t("columnTarget")}: {r.reportedName || r.reportedId.slice(0, 8)}</span>
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
          <div className="text-muted-foreground">{t("noContentReportsFound")}</div>
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
                        {r.isOverdue && (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800">
                            {t("slaOverdue")}
                          </span>
                        )}
                        {r.contentDeleted && (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
                            {t("contentRemoved")}
                          </span>
                        )}
                      </div>
                      <p className="text-sm line-clamp-2">{r.contentPreview || r.contentTitle || r.reason}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{t("reportReason")}: {r.reason}</p>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{t("columnReporter")}: {r.reporterName || r.reporterId.slice(0, 8)}</span>
                        <span>{t("columnCreator")}: {r.creatorName || r.creatorId?.slice(0, 8) || "—"}</span>
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
        <div className="text-muted-foreground">{t("noBlocksFound")}</div>
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
