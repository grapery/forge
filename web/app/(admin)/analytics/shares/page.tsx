"use client"

import { useEffect, useState, useCallback } from "react"
import { shareApi } from "@/lib/api/admin"
import { StatCard } from "@/components/shared/stat-card"
import { Share2, MousePointerClick, TrendingUp, CalendarDays } from "lucide-react"
import { PageSkeleton } from "@/components/shared/skeleton"
import { LineChart } from "@/components/charts/line-chart"
import { DonutChart } from "@/components/charts/donut-chart"
import { ClientOnly } from "@/components/charts/client-only"
import { DataTable } from "@/components/shared/data-table"
import { PageHeader } from "@/components/shared/page-header"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslations } from "next-intl"
import type { ChartSeries } from "@/lib/chart-data"
import type { ShareOverview, ShareEventItem } from "@/lib/types"

type Range = "7d" | "30d" | "90d"

export default function ShareAnalyticsPage() {
  const [overview, setOverview] = useState<ShareOverview | null>(null)
  const [events, setEvents] = useState<ShareEventItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<Range>("30d")
  const [page, setPage] = useState(1)
  const [eventType, setEventType] = useState("all")
  const [kind, setKind] = useState("all")
  const pageSize = 20

  const t = useTranslations("analyticsShares")
  const dt = useTranslations("dashboard")

  useEffect(() => {
    setLoading(true)
    shareApi
      .overview(range)
      .then(setOverview)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [range])

  const fetchEvents = useCallback(() => {
    shareApi
      .events({
        page,
        pageSize,
        eventType: eventType === "all" ? undefined : eventType,
        kind: kind === "all" ? undefined : kind,
      })
      .then((data) => {
        setEvents(data.items || [])
        setTotal(data.total)
      })
      .catch(() => {})
  }, [page, eventType, kind])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  if (loading && !overview) return <PageSkeleton />

  const dailySeries: ChartSeries[] = [
    {
      key: "issues",
      label: t("issues"),
      color: "#2383E2",
      values: (overview?.daily || []).map((d) => ({
        date: new Date(d.date),
        value: d.issues,
      })),
    },
    {
      key: "opens",
      label: t("opens"),
      color: "#10b981",
      values: (overview?.daily || []).map((d) => ({
        date: new Date(d.date),
        value: d.opens,
      })),
    },
  ]

  const kindIssueData = (overview?.byKindIssues || []).map((k) => ({
    label: k.kind || "-",
    value: k.count,
  }))
  const kindOpenData = (overview?.byKindOpens || []).map((k) => ({
    label: k.kind || "-",
    value: k.count,
  }))

  const formatTime = (ts: number) => {
    if (!ts) return "-"
    return new Date(ts * 1000).toLocaleString()
  }

  const openRatePct = ((overview?.openRate ?? 0) * 100).toFixed(1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <PageHeader title={t("title")} description={t("description")} icon={Share2} />
        <div className="inline-flex rounded-md border border-border bg-secondary p-0.5">
          {(["7d", "30d", "90d"] as Range[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-[5px] px-2.5 py-1 text-xs transition-colors ${
                range === r
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r === "7d" ? dt("range7d") : r === "30d" ? dt("range30d") : dt("range90d")}
            </button>
          ))}
        </div>
      </div>

      <ClientOnly>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title={t("statIssues")} value={overview?.totalIssues ?? 0} icon={Share2} />
          <StatCard title={t("statOpens")} value={overview?.totalOpens ?? 0} icon={MousePointerClick} />
          <StatCard title={t("statOpenRate")} value={`${openRatePct}%`} icon={TrendingUp} />
          <StatCard
            title={t("statToday")}
            value={`${overview?.issuesToday ?? 0} / ${overview?.opensToday ?? 0}`}
            icon={CalendarDays}
          />
        </div>

        <LineChart series={dailySeries} title={t("trendTitle")} height={320} />

        <div className="grid gap-4 md:grid-cols-2">
          {kindIssueData.length > 0 && (
            <DonutChart
              data={kindIssueData}
              title={t("issuesByKind")}
              centerLabel={t("issues")}
              centerValue={String(overview?.totalIssues ?? 0)}
            />
          )}
          {kindOpenData.length > 0 && (
            <DonutChart
              data={kindOpenData}
              title={t("opensByKind")}
              centerLabel={t("opens")}
              centerValue={String(overview?.totalOpens ?? 0)}
            />
          )}
        </div>
      </ClientOnly>

      <div className="flex items-center gap-4">
        <Select value={eventType} onValueChange={(v) => { setEventType(v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("filterEventType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAll")}</SelectItem>
            <SelectItem value="issue">{t("issues")}</SelectItem>
            <SelectItem value="open">{t("opens")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={kind} onValueChange={(v) => { setKind(v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("filterKind")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAll")}</SelectItem>
            <SelectItem value="fragment">fragment</SelectItem>
            <SelectItem value="storyboard">storyboard</SelectItem>
            <SelectItem value="story">story</SelectItem>
            <SelectItem value="character">character</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={events}
        pagination={{ page, pageSize, total }}
        onPageChange={setPage}
        columns={[
          {
            key: "eventType",
            header: t("columnEvent"),
            render: (row: ShareEventItem) => row.eventType,
          },
          {
            key: "kind",
            header: t("columnKind"),
            render: (row: ShareEventItem) => row.kind,
          },
          {
            key: "contentId",
            header: t("columnContent"),
            render: (row: ShareEventItem) => (
              <span className="font-mono text-xs">{row.contentId}</span>
            ),
          },
          {
            key: "platform",
            header: t("columnPlatform"),
            render: (row: ShareEventItem) => row.platform || "-",
          },
          {
            key: "source",
            header: t("columnSource"),
            render: (row: ShareEventItem) => row.source || "-",
          },
          {
            key: "user",
            header: t("columnUser"),
            render: (row: ShareEventItem) => row.userName || row.userId || "-",
          },
          {
            key: "createdAt",
            header: t("columnCreated"),
            render: (row: ShareEventItem) => formatTime(row.createdAt),
          },
        ]}
      />
    </div>
  )
}
