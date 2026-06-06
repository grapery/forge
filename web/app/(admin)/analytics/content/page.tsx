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
import type { DailyTrend, OverviewStats, CharacterStatusCount, ContentStatusCount } from "@/lib/types"

type Range = "7d" | "30d" | "90d"

export default function ContentAnalyticsPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [charCounts, setCharCounts] = useState<CharacterStatusCount | null>(null)
  const [storyCounts, setStoryCounts] = useState<ContentStatusCount | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<Range>("30d")

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
    { key: "newStories", label: "Stories", color: "#3b82f6" },
    { key: "newStoryboards", label: "Storyboards", color: "#8b5cf6" },
    { key: "newFragments", label: "Fragments", color: "#10b981" },
    { key: "newCharacters", label: "Characters", color: "#f59e0b" },
  ])

  const contentTypeData = [
    { label: "Stories", value: stats?.totalStories ?? 0 },
    { label: "Storyboards", value: stats?.totalStoryboards ?? 0 },
    { label: "Fragments", value: stats?.totalFragments ?? 0 },
    { label: "Characters", value: stats?.totalCharacters ?? 0 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Content Analytics</h1>
          <p className="text-muted-foreground">Content creation trends and distribution</p>
        </div>
        <div className="flex gap-1">
          {(["7d", "30d", "90d"] as Range[]).map((r) => (
            <Button key={r} variant={range === r ? "default" : "outline"} size="sm" onClick={() => setRange(r)}>
              {r}
            </Button>
          ))}
        </div>
      </div>

      <ClientOnly>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Stories" value={stats?.totalStories ?? 0} icon={BookOpen} />
          <StatCard title="Storyboards" value={stats?.totalStoryboards ?? 0} icon={Layers} />
          <StatCard title="Fragments" value={stats?.totalFragments ?? 0} icon={Puzzle} />
          <StatCard title="Characters" value={stats?.totalCharacters ?? 0} icon={UserCircle} />
        </div>

        <LineChart series={contentSeries} title="Content Creation Trend" height={320} />

        <div className="grid gap-4 md:grid-cols-2">
          <BarChart data={contentTypeData} title="Content Type Distribution" horizontal />
          {charCounts && (
            <DonutChart
              data={[
                { label: "Public", value: charCounts.public },
                { label: "Private", value: charCounts.private },
                { label: "AI Generated", value: charCounts.aiGenerated },
              ]}
              title="Character Distribution"
              centerLabel="Total"
              centerValue={String(charCounts.total)}
            />
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <TreemapChart
            data={contentTypeData}
            title="Content Composition"
          />
          {storyCounts && (
            <DonutChart
              data={[
                { label: "Published", value: storyCounts.published },
                { label: "Draft", value: storyCounts.draft },
                { label: "Other", value: storyCounts.other },
              ]}
              title="Story Status"
              centerLabel="Total"
              centerValue={String(storyCounts.total)}
            />
          )}
        </div>
      </ClientOnly>
    </div>
  )
}
