"use client"

import { useEffect, useState } from "react"
import { dashboardApi, aiTaskApi, aiGenerationApi } from "@/lib/api/admin"
import { StatCard } from "@/components/shared/stat-card"
import { Brain, Sparkles, Zap, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageSkeleton } from "@/components/shared/skeleton"
import { LineChart } from "@/components/charts/line-chart"
import { DonutChart } from "@/components/charts/donut-chart"
import { BarChart } from "@/components/charts/bar-chart"
import { TreemapChart } from "@/components/charts/treemap-chart"
import { ClientOnly } from "@/components/charts/client-only"
import { dailyTrendToSeries } from "@/lib/chart-data"
import type { OverviewStats, AITaskSummary, AIGenerationSummary } from "@/lib/types"

type Range = "7d" | "30d" | "90d"

export default function AIAnalyticsPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [taskSummary, setTaskSummary] = useState<AITaskSummary | null>(null)
  const [genSummary, setGenSummary] = useState<AIGenerationSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<Range>("30d")

  useEffect(() => {
    setLoading(true)
    Promise.all([dashboardApi.getOverview(range), aiTaskApi.summary(), aiGenerationApi.summary()])
      .then(([s, t, g]) => { setStats(s); setTaskSummary(t); setGenSummary(g) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [range])

  if (loading) return <PageSkeleton />

  const trends = stats?.trends || []

  const tokenSeries = dailyTrendToSeries(trends, [
    { key: "tokenConsumed", label: "Tokens Consumed", color: "#ef4444" },
    { key: "newAITasks", label: "New AI Tasks", color: "#3b82f6" },
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Analytics</h1>
          <p className="text-muted-foreground">AI usage, token consumption, and generation performance</p>
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
          <StatCard title="Total AI Tasks" value={taskSummary?.totalTasks ?? 0} icon={Brain} />
          <StatCard title="Tokens Used" value={taskSummary?.totalTokens?.toLocaleString() ?? 0} icon={Zap} />
          <StatCard title="Images Generated" value={genSummary?.totalImages?.toLocaleString() ?? 0} icon={Sparkles} />
          <StatCard title="Avg Duration" value={`${Math.round((genSummary?.avgDurationMs ?? 0) / 1000)}s`} icon={Clock} />
        </div>

        <LineChart series={tokenSeries} title="Token Consumption & Task Trend" height={320} />

        <div className="grid gap-4 md:grid-cols-2">
          {taskSummary && (
            <DonutChart
              data={[
                { label: "Completed", value: taskSummary.completedTasks },
                { label: "Pending", value: taskSummary.pendingTasks },
                { label: "Failed", value: taskSummary.failedTasks },
              ]}
              title="Task Status Distribution"
              centerLabel="Total"
              centerValue={String(taskSummary.totalTasks)}
            />
          )}
          {taskSummary?.topProviders && taskSummary.topProviders.length > 0 && (
            <TreemapChart
              data={taskSummary.topProviders.map((p) => ({ label: p.provider, value: p.count }))}
              title="Provider Usage Distribution"
            />
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {genSummary && (
            <BarChart
              data={[
                { label: "Images", value: genSummary.totalImages },
                { label: "Videos", value: genSummary.totalVideos },
                { label: "Records", value: genSummary.totalRecords },
              ]}
              title="Generation Output Types"
              horizontal
            />
          )}
          {taskSummary?.topProviders && taskSummary.topProviders.length > 0 && (
            <BarChart
              data={taskSummary.topProviders.map((p) => ({ label: p.provider, value: p.count }))}
              title="Provider Task Count"
              horizontal
            />
          )}
        </div>
      </ClientOnly>
    </div>
  )
}
