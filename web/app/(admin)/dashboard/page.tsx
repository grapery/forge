"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { dashboardApi, userApi, characterApi, membershipApi, aiTaskApi, deviceApi, blockApi } from "@/lib/api/admin"
import { StatCard } from "@/components/shared/stat-card"
import { Users, BookOpen, Layers, Puzzle, UserCircle, Brain, CreditCard, Receipt, Coins, RefreshCw, GitFork, Zap, Flag, ShieldAlert } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageSkeleton } from "@/components/shared/skeleton"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { LineChart } from "@/components/charts/line-chart"
import { DonutChart } from "@/components/charts/donut-chart"
import { HeatmapCalendar } from "@/components/charts/heatmap-calendar"
import { ChartLegend } from "@/components/charts/chart-legend"
import { ClientOnly } from "@/components/charts/client-only"
import { dailyTrendToSeries } from "@/lib/chart-data"
import type { OverviewStats, DailyTrend, UserStatusCount, CharacterStatusCount, MembershipSummary, AITaskSummary, DevicePlatformCount, BlockCounts } from "@/lib/types"

type Range = "7d" | "30d" | "90d"

const TREND_KEYS = [
  { key: "newUsers" as const, labelKey: "trendNewUsers", color: "#3b82f6" },
  { key: "newStories" as const, labelKey: "trendNewStories", color: "#8b5cf6" },
  { key: "newOrders" as const, labelKey: "trendNewOrders", color: "#10b981" },
  { key: "newFragments" as const, labelKey: "trendNewFragments", color: "#f59e0b" },
  { key: "newStoryboards" as const, labelKey: "trendNewStoryboards", color: "#06b6d4" },
  { key: "forkEvents" as const, labelKey: "trendForkEvents", color: "#ec4899" },
  { key: "tokenConsumed" as const, labelKey: "trendTokenConsumed", color: "#ef4444" },
]

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
  const [deviceCounts, setDeviceCounts] = useState<DevicePlatformCount | null>(null)
  const [blockCounts, setBlockCounts] = useState<BlockCounts | null>(null)
  const [moderationCountsError, setModerationCountsError] = useState("")

  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(() => new Set(TREND_KEYS.map((k) => k.key)))

  const t = useTranslations("dashboard")

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
  }, [range])

  useEffect(() => {
    userApi.statusCounts().then(setUserCounts).catch(() => {})
    characterApi.statusCounts().then(setCharCounts).catch(() => {})
    membershipApi.summary().then(setMemberSummary).catch(() => {})
    aiTaskApi.summary().then(setAiSummary).catch(() => {})
    deviceApi.platformCounts().then(setDeviceCounts).catch(() => {})
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

  if (loading) return <PageSkeleton />

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="text-muted-foreground">{t("description")}</p>
          </div>
        </div>
        <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
      </div>
    )
  }

  const trends = stats?.trends || []

  const statCards = [
    { title: t("statTotalUsers"), value: stats?.totalUsers ?? 0, icon: Users },
    { title: t("statTotalStories"), value: stats?.totalStories ?? 0, icon: BookOpen },
    { title: t("statTotalStoryboards"), value: stats?.totalStoryboards ?? 0, icon: Layers },
    { title: t("statTotalFragments"), value: stats?.totalFragments ?? 0, icon: Puzzle },
    { title: t("statTotalCharacters"), value: stats?.totalCharacters ?? 0, icon: UserCircle },
    { title: t("statAiTasks"), value: stats?.totalAITasks ?? 0, icon: Brain },
    { title: t("statActiveMemberships"), value: stats?.activeMemberships ?? 0, icon: CreditCard },
    { title: t("statTotalOrders"), value: stats?.totalOrders ?? 0, icon: Receipt },
    { title: t("statTokenTransactions"), value: stats?.totalTokenTransactions ?? 0, icon: Coins },
    { title: t("statForkEvents"), value: stats?.totalForkEvents ?? 0, icon: GitFork },
    { title: t("statTokenConsumed"), value: stats?.totalTokenConsumed ?? 0, icon: Zap },
  ]

  const rangeOptions: { value: Range; label: string }[] = [
    { value: "7d", label: t("range7d") },
    { value: "30d", label: t("range30d") },
    { value: "90d", label: t("range90d") },
  ]

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
    () => trends.map((t) => ({ date: t.date, value: t.newUsers })),
    [trends],
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleCollect} disabled={collecting} className="active:scale-[0.97] transition-all duration-200">
          <RefreshCw className={`mr-2 h-4 w-4 ${collecting ? "animate-spin" : ""}`} />
          {collecting ? t("buttonCollecting") : t("buttonCollect")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {statCards.map((card, i) => (
          <div key={card.title} className="animate-fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
            <StatCard title={card.title} value={card.value} icon={card.icon} />
          </div>
        ))}
      </div>

      <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Flag className="h-4 w-4" />
              {t("moderationCardTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {moderationCountsError && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {moderationCountsError}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <p className="text-xs text-muted-foreground">{t("moderationPendingUser")}</p>
                <p className="text-2xl font-bold">{stats?.pendingUserReports ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("moderationPendingContent")}</p>
                <p className="text-2xl font-bold">{stats?.pendingContentReports ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-red-700 flex items-center gap-1">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {t("moderationOverdue")}
                </p>
                <p className="text-2xl font-bold text-red-700">{stats?.overdueReportsTotal ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("moderationBlocksTotal")}</p>
                <p className="text-2xl font-bold">{blockCounts?.total ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("moderationBlocksLast7Days")}</p>
                <p className="text-2xl font-bold">{blockCounts?.last7Days ?? "—"}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/reports?tab=users">{t("moderationLinkUserReports")}</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/reports?tab=content">{t("moderationLinkContentReports")}</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/reports?tab=blocks">{t("moderationLinkBlocks")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

      {trends.length > 0 && (
        <ClientOnly>
          <>
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">{t("trendsTitle", { n: trends.length })}</h2>
                <div className="flex gap-1">
                  {rangeOptions.map((opt) => (
                    <Button key={opt.value} variant={range === opt.value ? "default" : "outline"} size="sm" onClick={() => setRange(opt.value)}>
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
              <Card>
                <CardContent className="pt-4">
                  <ChartLegend items={legendItems} visibleKeys={visibleKeys} onToggle={toggleSeries} />
                  <div className="mt-3">
                    <LineChart
                      series={trendSeries}
                      height={340}
                      visibleKeys={visibleKeys}
                      ariaLabel={t("trendsTitle", { n: trends.length })}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                    { label: t("chartFree"), value: memberSummary.freeMembers },
                    { label: t("chartBasic"), value: memberSummary.basicMembers },
                    { label: t("chartPremium"), value: memberSummary.premiumMembers },
                  ]}
                  title={t("chartMembership")}
                  centerLabel={t("chartActive")}
                  centerValue={String(memberSummary.activeMemberships)}
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
            </div>

            <HeatmapCalendar data={heatmapData} title={t("chartRegistrationActivity")} weeks={12} />
          </>
        </ClientOnly>
      )}

      {trends.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>{t("noTrendData")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
