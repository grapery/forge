"use client"

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"

import { searchApi } from "@/lib/api/admin"

import type { SearchHistoryItem, SearchTrend } from "@/lib/types"

import { PageHeader } from "@/components/shared/page-header"

import { DataTable } from "@/components/shared/data-table"

import { SearchInput } from "@/components/shared/search-input"

import { Badge } from "@/components/ui/badge"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { Search, TrendingUp } from "lucide-react"
import { AdminPage } from "@/components/layout/admin-page"


export default function SearchAnalyticsPage() {
  const t = useTranslations("searchAnalytics")
  const [items, setItems] = useState<SearchHistoryItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [type, setType] = useState("")
  const pageSize = 20

  const [trends, setTrends] = useState<SearchTrend[]>([])

  const fetchData = useCallback(() => {
    setLoading(true)
    searchApi
      .history({
        page,
        pageSize,
        type: type === "" || type === "all" ? undefined : type,
        userId: search || undefined,
      })
      .then((data) => {
        setItems(data.items || [])
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, search, type])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    searchApi.trends(20).then(setTrends).catch(() => {})
  }, [])

  const formatTime = (ts: number | null) => {
    if (!ts) return "-"
    return new Date(ts * 1000).toLocaleDateString()
  }

  const maxTrendCount = trends.length > 0 ? Math.max(...trends.map((t) => t.count)) : 1

  return (
    <AdminPage>
      <PageHeader title={t("title")} description={t("description")} icon={Search} />

      <div className="flex items-center gap-4">
        <div className="w-64">
          <SearchInput onSearch={setSearch} placeholder={t("searchPlaceholder")} />
        </div>
        <Select value={type || "all"} onValueChange={(v) => setType(v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("filterAllTypes")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAllTypes")}</SelectItem>
            <SelectItem value="story">{t("filterStory")}</SelectItem>
            <SelectItem value="fragment">{t("filterFragment")}</SelectItem>
            <SelectItem value="character">{t("filterCharacter")}</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <PageSkeleton />
      ) : (
        <DataTable
          data={items}
          pagination={{ page, pageSize, total }}
          onPageChange={setPage}
          columns={[
            {
              key: "userName",
              header: t("columnUser"),
              render: (item: SearchHistoryItem) => (
                <span className="text-sm font-medium">{item.userName}</span>
              ),
            },
            {
              key: "query",
              header: t("columnQuery"),
              render: (item: SearchHistoryItem) => (
                <span className="text-sm">{item.query}</span>
              ),
            },
            {
              key: "type",
              header: t("columnType"),
              render: (item: SearchHistoryItem) => (
                <Badge variant="secondary">{item.type}</Badge>
              ),
            },
            {
              key: "resultCount",
              header: t("columnResults"),
              render: (item: SearchHistoryItem) => (
                <span className="text-sm">{item.resultCount}</span>
              ),
            },
            {
              key: "createdAt",
              header: t("columnCreated"),
              render: (item: SearchHistoryItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(item.createdAt)}</span>
              ),
            },
          ]}
        />
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Top Search Trends</h2>
        </div>
        {trends.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">No trend data available</div>
        ) : (
          <div className="space-y-2">
            {trends.map((trend) => (
              <div key={trend.query} className="flex items-center gap-3">
                <span className="w-40 truncate text-sm font-medium">{trend.query}</span>
                <div className="flex-1">
                  <div
                    className="h-6 rounded bg-primary/80 transition-all"
                    style={{ width: `${(trend.count / maxTrendCount) * 100}%` }}
                  />
                </div>
                <span className="w-16 text-right text-sm text-muted-foreground">{trend.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminPage>
  )
}
