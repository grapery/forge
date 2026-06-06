"use client"

import { useEffect, useState } from "react"
import { dashboardApi, characterApi, contentApi } from "@/lib/api/admin"
import { StatCard } from "@/components/shared/stat-card"
import { BookOpen, Layers, Puzzle, UserCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageSkeleton } from "@/components/shared/skeleton"
import { LineChart } from "@/components/charts/line-chart"
import { DonutChart } from "@/components/charts/donut-chart"
import { BarChart } from "@/components/charts/bar-chart"
import { TreemapChart } from "@/components/charts/treemap-chart"
import { ClientOnly } from "@/components/charts/client-only"
import { dailyTrendToSeries } from "@/lib/chart-data"
import { useTranslations } from "next-intl"
import type { DailyTrend, OverviewStats, CharacterStatusCount, ContentStatusCount } from "@/lib/types"

type Range = "7d" | "30d" | "90d"

export default function ContentAnalyticsPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [charCounts, setCharCounts] = useState<CharacterStatusCount | null>(null)
  const [storyCounts, setStoryCounts] = useState<ContentStatusCount | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<Range>("30d")

  const t = useTranslations("analyticsContent")
  const dt = useTranslations("dashboard")

  useEffect(() => {
    setLoading(true)
    Promise.all([dashboardApi.getOverview(range), characterApi.statusCounts(), contentApi.statusCounts("story")])
      .then(([s, c, sc]) => { setStats(s); setCharCounts(c); setStoryCounts(sc) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [range])

  if (loading) return <PageSkeleton />

  const trends = stats?.trends || []

  const contentSeries = dailyTrendToSeries(trends, [
    { key: "newStories", label: t("stories"), color: "#3b82f6" },
    { key: "newStoryboards", label: t("storyboards"), color: "#8b5cf6" },
    { key: "newFragments", label: t("fragments"), color: "#10b981" },
    { key: "newCharacters", label: t("characters"), color: "#f59e0b" },
  ])

  const contentTypeData = [
    { label: t("stories"), value: stats?.totalStories ?? 0 },
    { label: t("storyboards"), value: stats?.totalStoryboards ?? 0 },
    { label: t("fragments"), value: stats?.totalFragments ?? 0 },
    { label: t("characters"), value: stats?.totalCharacters ?? 0 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex gap-1">
          {(["7d", "30d", "90d"] as Range[]).map((r) => (
            <Button key={r} variant={range === r ? "default" : "outline"} size="sm" onClick={() => setRange(r)}>
              {r === "7d" ? dt("range7d") : r === "30d" ? dt("range30d") : dt("range90d")}
            </Button>
          ))}
        </div>
      </div>

      <ClientOnly>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title={t("statStories")} value={stats?.totalStories ?? 0} icon={BookOpen} />
          <StatCard title={t("statStoryboards")} value={stats?.totalStoryboards ?? 0} icon={Layers} />
          <StatCard title={t("statFragments")} value={stats?.totalFragments ?? 0} icon={Puzzle} />
          <StatCard title={t("statCharacters")} value={stats?.totalCharacters ?? 0} icon={UserCircle} />
        </div>

        <LineChart series={contentSeries} title={t("creationTrend")} height={320} />

        <div className="grid gap-4 md:grid-cols-2">
          <BarChart data={contentTypeData} title={t("typeDistribution")} horizontal />
          {charCounts && (
            <DonutChart
              data={[
                { label: t("public"), value: charCounts.public },
                { label: t("private"), value: charCounts.private },
                { label: t("aiGenerated"), value: charCounts.aiGenerated },
              ]}
              title={t("characterDistribution")}
              centerLabel={t("total")}
              centerValue={String(charCounts.total)}
            />
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <TreemapChart
            data={contentTypeData}
            title={t("contentComposition")}
          />
          {storyCounts && (
            <DonutChart
              data={[
                { label: t("published"), value: storyCounts.published },
                { label: t("draft"), value: storyCounts.draft },
                { label: t("other"), value: storyCounts.other },
              ]}
              title={t("storyStatus")}
              centerLabel={t("total")}
              centerValue={String(storyCounts.total)}
            />
          )}
        </div>
      </ClientOnly>
    </div>
  )
}
