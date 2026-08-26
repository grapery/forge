"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import Link from "next/link"
import { dashboardApi, blockApi } from "@/lib/api/admin"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PageSkeleton } from "@/components/shared/skeleton"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { LineChart } from "@/components/charts/line-chart"
import { DonutChart } from "@/components/charts/donut-chart"
import { HeatmapCalendar } from "@/components/charts/heatmap-calendar"
import { ChartLegend } from "@/components/charts/chart-legend"
import { ClientOnly } from "@/components/charts/client-only"
import { dailyTrendToSeries } from "@/lib/chart-data"
import { SERIES_COLORS } from "@/components/charts/chart-theme"
import type { OverviewStats, BlockCounts } from "@/lib/types"
import { RefreshCw, Flag, ShieldAlert, Sparkles, ArrowRight, LayoutDashboard } from "lucide-react"
import { userApi, characterApi, membershipApi, aiTaskApi } from "@/lib/api/admin"
import type { UserStatusCount, CharacterStatusCount, MembershipSummary, AITaskSummary } from "@/lib/types"
import { cn } from "@/lib/utils"
import { LoadErrorBanner } from "@/components/shared/load-error-banner"
import { PageHeader } from "@/components/shared/page-header"
import { AdminPage } from "@/components/layout/admin-page"

type Range = "7d" | "30d" | "90d"

const TREND_KEYS = [
  { key: "newUsers" as const, labelKey: "trendNewUsers", color: SERIES_COLORS[0] },
  { key: "newStories" as const, labelKey: "trendNewStories", color: SERIES_COLORS[1] },
  { key: "newOrders" as const, labelKey: "trendNewOrders", color: SERIES_COLORS[2] },
  { key: "newFragments" as const, labelKey: "trendNewFragments", color: SERIES_COLORS[3] },
  { key: "newStoryboards" as const, labelKey: "trendNewStoryboards", color: SERIES_COLORS[4] },
  { key: "forkEvents" as const, labelKey: "trendForkEvents", color: SERIES_COLORS[5] },
  { key: "tokenConsumed" as const, labelKey: "trendTokenConsumed", color: SERIES_COLORS[6] },
]

const DEFAULT_VISIBLE = new Set(["newUsers", "newStories", "newOrders"])

export default function DashboardPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [collecting, setCollecting] = useState(false)
  const [error, setError] = useState("")
  const [range, setRange] = useState<Range>("30d")
  const [userCounts, setUserCounts] = useState<UserStatusCount | null>(null)
  const [charCounts, setCharCounts] = useState<CharacterStatusCount | null>(null)
  const [memberSummary, setMemberSummary] = useState<MembershipSummary | null>(null)
  const [aiSummary, setAiSummary] = useState<AITaskSummary | null>(null)
  const [blockCounts, setBlockCounts] = useState<BlockCounts | null>(null)
  const [moderationCountsError, setModerationCountsError] = useState("")
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(() => new Set(DEFAULT_VISIBLE))

  const t = useTranslations("dashboard")
  const to = useTranslations("opsAssistant")

  const fetchData = useCallback((r?: Range) => {
    setLoading(true)
    setError("")
    dashboardApi
      .getOverview(r)
      .then(setStats)
      .catch((err) => setError(err.message || t("errorLoadFailed")))
      .finally(() => setLoading(false))
  }, [t])

  useEffect(() => {
    fetchData(range)
  }, [range, fetchData])

  useEffect(() => {
    userApi.statusCounts().then(setUserCounts).catch(() => {})
    characterApi.statusCounts().then(setCharCounts).catch(() => {})
    membershipApi.summary().then(setMemberSummary).catch(() => {})
    aiTaskApi.summary().then(setAiSummary).catch(() => {})
    blockApi.counts().then(setBlockCounts).catch((err: Error) => {
      setBlockCounts(null)
      setModerationCountsError(err.message || t("moderationCountsFailed"))
    })
  }, [t])

  const handleCollect = async () => {
    setCollecting(true)
    try {
      await dashboardApi.collectStats()
      toast.success(t("toastCollected"))
      fetchData(range)
    } catch (err: any) {
      toast.error(err.message || t("toastCollectFailed"))
    } finally {
      setCollecting(false)
    }
  }

  const toggleSeries = useCallback((key: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        if (next.size > 1) next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  const trends = stats?.trends || []

  const trendSeries = useMemo(() => {
    if (trends.length === 0) return []
    return dailyTrendToSeries(
      trends,
      TREND_KEYS.map((k) => ({ key: k.key, label: t(k.labelKey), color: k.color })),
    )
  }, [trends, t])

  const legendItems = useMemo(
    () => TREND_KEYS.map((k) => ({ key: k.key, label: t(k.labelKey), color: k.color })),
    [t],
  )

  const heatmapData = useMemo(
    () => trends.map((row) => ({ date: row.date, value: row.newUsers })),
    [trends],
  )

  if (loading) return <PageSkeleton />

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("title")} icon={LayoutDashboard} />
        <LoadErrorBanner message={error} onRetry={() => fetchData(range)} />
      </div>
    )
  }

  const keyMetrics = [
    { label: t("statTotalUsers"), value: stats?.totalUsers ?? 0 },
    { label: t("statTotalStories"), value: stats?.totalStories ?? 0 },
    { label: t("statTotalOrders"), value: stats?.totalOrders ?? 0 },
    { label: t("statTokenConsumed"), value: stats?.totalTokenConsumed ?? 0 },
  ]

  const moreCounts = [
    { label: t("statTotalStoryboards"), value: stats?.totalStoryboards ?? 0 },
    { label: t("statTotalFragments"), value: stats?.totalFragments ?? 0 },
    { label: t("statTotalCharacters"), value: stats?.totalCharacters ?? 0 },
    { label: t("statAiTasks"), value: stats?.totalAITasks ?? 0 },
    { label: t("statActiveMemberships"), value: stats?.activeMemberships ?? 0 },
    { label: t("statTokenTransactions"), value: stats?.totalTokenTransactions ?? 0 },
    { label: t("statForkEvents"), value: stats?.totalForkEvents ?? 0 },
  ]

  const rangeOptions: { value: Range; label: string }[] = [
    { value: "7d", label: t("range7d") },
    { value: "30d", label: t("range30d") },
    { value: "90d", label: t("range90d") },
  ]

  const overdue = stats?.overdueReportsTotal ?? 0
  const pendingTotal = (stats?.pendingUserReports ?? 0) + (stats?.pendingContentReports ?? 0)

  return (
    <AdminPage className="space-y-7">
      <PageHeader title={t("title")} description={t("description")} icon={LayoutDashboard} actions={
        <Button variant="outline" size="sm" onClick={handleCollect} disabled={collecting}>
          <RefreshCw className={cn("mr-2 h-3.5 w-3.5", collecting && "animate-spin")} />
          {collecting ? t("buttonCollecting") : t("buttonCollect")}
        </Button>
      } />

      <section className={cn(
        "rounded-xl border border-border bg-card px-4 py-4 shadow-sm",
        overdue > 0 ? "border-l-2 border-l-[var(--status-danger)]" : "border-l-2 border-l-[var(--status-warning)]",
      )}>
        <div className="flex items-center gap-2 mb-3">
          <Flag className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">{t("moderationCardTitle")}</h2>
        </div>
        {moderationCountsError && (
          <div role="alert" className="mb-2 rounded-md bg-[var(--status-danger-bg)] px-3 py-2 text-sm text-[var(--status-danger)]">
            {moderationCountsError}
          </div>
        )}
        {pendingTotal === 0 && overdue === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("moderationPendingUser")}: 0 · {t("moderationPendingContent")}: 0
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 text-sm">
            <Link href="/reports?tab=users&status=pending" className="rounded-md hover:bg-secondary/50 p-1 -m-1 transition-colors">
              <p className="text-xs text-muted-foreground">{t("moderationPendingUser")}</p>
              <p className="text-lg font-medium tabular-nums">{stats?.pendingUserReports ?? 0}</p>
            </Link>
            <Link href="/reports?tab=content&status=pending" className="rounded-md hover:bg-secondary/50 p-1 -m-1 transition-colors">
              <p className="text-xs text-muted-foreground">{t("moderationPendingContent")}</p>
              <p className="text-lg font-medium tabular-nums">{stats?.pendingContentReports ?? 0}</p>
            </Link>
            <Link href="/reports?tab=users&overdue=1" className="rounded-md hover:bg-secondary/50 p-1 -m-1 transition-colors">
              <p className="text-xs text-[var(--status-danger)] flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5" />
                {t("moderationOverdue")}
              </p>
              <p className="text-lg font-medium tabular-nums text-[var(--status-danger)]">{overdue}</p>
            </Link>
            <Link href="/reports?tab=blocks" className="rounded-md hover:bg-secondary/50 p-1 -m-1 transition-colors">
              <p className="text-xs text-muted-foreground">{t("moderationBlocksTotal")}</p>
              <p className="text-lg font-medium tabular-nums">{blockCounts?.total ?? "—"}</p>
            </Link>
            <div>
              <p className="text-xs text-muted-foreground">{t("moderationBlocksLast7Days")}</p>
              <p className="text-lg font-medium tabular-nums">{blockCounts?.last7Days ?? "—"}</p>
            </div>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link href="/reports?tab=users&status=pending" className="text-primary hover:underline">{t("moderationLinkUserReports")}</Link>
          <Link href="/reports?tab=content&status=pending" className="text-primary hover:underline">{t("moderationLinkContentReports")}</Link>
          <Link href="/reports?tab=blocks" className="text-primary hover:underline">{t("moderationLinkBlocks")}</Link>
          {(stats?.overdueFeedback ?? 0) > 0 && (
            <Link href="/feedback?overdue=1" className="text-[var(--status-danger)] hover:underline">
              {t("moderationLinkOverdueFeedback", { n: stats?.overdueFeedback ?? 0 })}
            </Link>
          )}
          {(stats?.openFeedback ?? 0) > 0 && (
            <Link href="/feedback?status=received" className="text-primary hover:underline">
              {t("moderationLinkOpenFeedback", { n: stats?.openFeedback ?? 0 })}
            </Link>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">{t("keyMetrics")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {keyMetrics.map((m) => (
            <div key={m.label} className="rounded-lg border border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className="text-2xl font-medium tabular-nums tracking-tight mt-1">{m.value.toLocaleString()}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {moreCounts.map((m) => (
            <div key={m.label} className="flex items-center justify-between border-b border-border py-2 text-sm">
              <span className="text-muted-foreground">{m.label}</span>
              <span className="font-medium tabular-nums">{m.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </section>

      {trends.length > 0 && (
        <ClientOnly>
          <>
            <section>
              <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                <h2 className="text-sm font-medium">{t("trendsTitle", { n: trends.length })}</h2>
                <div className="inline-flex rounded-md border border-border bg-secondary p-0.5">
                  {rangeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRange(opt.value)}
                      className={cn(
                        "rounded-[5px] px-2.5 py-1 text-xs transition-colors",
                        range === opt.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <Card>
                <CardContent className="pt-4">
                  <ChartLegend items={legendItems} visibleKeys={visibleKeys} onToggle={toggleSeries} />
                  <div className="mt-3">
                    <LineChart
                      series={trendSeries}
                      height={300}
                      visibleKeys={visibleKeys}
                      ariaLabel={t("trendsTitle", { n: trends.length })}
                    />
                  </div>
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {userCounts && (
                <DonutChart
                  data={[
                    { label: t("chartActive"), value: userCounts.active },
                    { label: t("chartSuspended"), value: userCounts.suspended },
                    { label: t("chartDeleted"), value: userCounts.deleted },
                  ]}
                  title={t("chartUserStatus")}
                  centerLabel={t("chartTotal")}
                  centerValue={String(userCounts.active + userCounts.suspended + userCounts.deleted)}
                />
              )}
              {charCounts && (
                <DonutChart
                  data={[
                    { label: t("chartPublic"), value: charCounts.public },
                    { label: t("chartPrivate"), value: charCounts.private },
                    { label: t("chartAiGenerated"), value: charCounts.aiGenerated },
                  ]}
                  title={t("chartCharacters")}
                  centerLabel={t("chartTotal")}
                  centerValue={String(charCounts.total)}
                />
              )}
              {memberSummary && (
                <DonutChart
                  data={[
                    { label: t("chartFree"), value: memberSummary.freeCount },
                    { label: t("chartBasic"), value: memberSummary.basicCount },
                    { label: t("chartPro"), value: memberSummary.proCount },
                    { label: t("chartPremium"), value: memberSummary.premiumCount },
                  ]}
                  title={t("chartMembership")}
                  centerLabel={t("chartActive")}
                  centerValue={String(memberSummary.totalActive)}
                />
              )}
              {aiSummary && (
                <DonutChart
                  data={[
                    { label: t("chartCompleted"), value: aiSummary.completedTasks },
                    { label: t("chartPending"), value: aiSummary.pendingTasks },
                    { label: t("chartFailed"), value: aiSummary.failedTasks },
                  ]}
                  title={t("chartAiTasks")}
                  centerLabel={t("chartTotal")}
                  centerValue={String(aiSummary.totalTasks)}
                />
              )}
            </section>

            <HeatmapCalendar data={heatmapData} title={t("chartRegistrationActivity")} weeks={12} />
          </>
        </ClientOnly>
      )}

      {trends.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            {t("noTrendData")}
          </CardContent>
        </Card>
      )}

      <Link
        href="/ops-assistant"
        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/50 px-4 py-3 hover:bg-secondary transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-background border border-border">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">{to("dashboardCta")}</p>
            <p className="text-xs text-muted-foreground">{to("dashboardCtaDesc")}</p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </Link>
    </AdminPage>
  )
}
