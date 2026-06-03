"use client"

import { useEffect, useState, useCallback } from "react"
import { dashboardApi } from "@/lib/api/admin"
import { StatCard } from "@/components/shared/stat-card"
import { Users, BookOpen, Layers, Puzzle, UserCircle, Brain, CreditCard, Receipt, Coins, RefreshCw, GitFork, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageSkeleton } from "@/components/shared/skeleton"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import type { OverviewStats, DailyTrend } from "@/lib/types"

type Range = "7d" | "30d" | "90d"

function MiniBarChart({ data, valueKey, label, color }: { data: DailyTrend[]; valueKey: keyof DailyTrend; label: string; color: string }) {
  const values = data.map((d) => Number(d[valueKey]) || 0)
  const max = Math.max(...values, 1)
  const showEvery = values.length > 30 ? Math.ceil(values.length / 15) : 1
  return (
    <Card className="animate-fade-in-up hover:shadow-md transition-shadow duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-px h-28">
          {values.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative min-w-0">
              <div
                className="w-full rounded-t transition-all duration-500"
                style={{
                  height: `${(v / max) * 100}%`,
                  minHeight: v > 0 ? "4px" : "0",
                  backgroundColor: color,
                  transitionDelay: `${i * 20}ms`,
                }}
              />
              {v > 0 && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-medium text-foreground bg-card border shadow-sm rounded px-1.5 py-0.5 pointer-events-none whitespace-nowrap z-10">
                  {v.toLocaleString()}
                </div>
              )}
              {(i % showEvery === 0 || i === values.length - 1) && (
                <span className="text-[9px] text-muted-foreground truncate w-full text-center">
                  {data[i]?.date?.slice(5) || ""}
                </span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [collecting, setCollecting] = useState(false)
  const [error, setError] = useState("")
  const [range, setRange] = useState<Range>("30d")
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

  const trendCharts = [
    { valueKey: "newUsers" as keyof DailyTrend, label: t("trendNewUsers"), color: "#3b82f6" },
    { valueKey: "newStories" as keyof DailyTrend, label: t("trendNewStories"), color: "#8b5cf6" },
    { valueKey: "newOrders" as keyof DailyTrend, label: t("trendNewOrders"), color: "#10b981" },
    { valueKey: "newFragments" as keyof DailyTrend, label: t("trendNewFragments"), color: "#f59e0b" },
    { valueKey: "newStoryboards" as keyof DailyTrend, label: t("trendNewStoryboards"), color: "#06b6d4" },
    { valueKey: "forkEvents" as keyof DailyTrend, label: t("trendForkEvents"), color: "#ec4899" },
    { valueKey: "tokenConsumed" as keyof DailyTrend, label: t("trendTokenConsumed"), color: "#ef4444" },
  ]

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

      {trends.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{t("trendsTitle", { n: trends.length })}</h2>
            <div className="flex gap-1">
              {rangeOptions.map((opt) => (
                <Button
                  key={opt.value}
                  variant={range === opt.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRange(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {trendCharts.map((chart) => (
              <MiniBarChart key={chart.valueKey} data={trends} valueKey={chart.valueKey} label={chart.label} color={chart.color} />
            ))}
          </div>
        </div>
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
