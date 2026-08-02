"use client"

import { useEffect, useState } from "react"
import { dashboardApi, aiTaskApi, aiGenerationApi } from "@/lib/api/admin"
import { StatCard } from "@/components/shared/stat-card"
import { Brain, Sparkles, Zap, Clock } from "lucide-react"
import { PageSkeleton } from "@/components/shared/skeleton"
import { LineChart } from "@/components/charts/line-chart"
import { DonutChart } from "@/components/charts/donut-chart"
import { BarChart } from "@/components/charts/bar-chart"
import { TreemapChart } from "@/components/charts/treemap-chart"
import { ClientOnly } from "@/components/charts/client-only"
import { dailyTrendToSeries } from "@/lib/chart-data"
import { useTranslations } from "next-intl"
import type { OverviewStats, AITaskSummary, AIGenerationSummary } from "@/lib/types"

type Range = "7d" | "30d" | "90d"

export default function AIAnalyticsPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [taskSummary, setTaskSummary] = useState<AITaskSummary | null>(null)
  const [genSummary, setGenSummary] = useState<AIGenerationSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<Range>("30d")

  const t = useTranslations("analyticsAi")
  const dt = useTranslations("dashboard")

  useEffect(() => {
    setLoading(true)
    Promise.all([dashboardApi.getOverview(range), aiTaskApi.summary(), aiGenerationApi.summary()])
      .then(([s, ts, g]) => { setStats(s); setTaskSummary(ts); setGenSummary(g) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [range])

  if (loading) return <PageSkeleton />

  const trends = stats?.trends || []

  const tokenSeries = dailyTrendToSeries(trends, [
    { key: "tokenConsumed", label: t("tokensConsumed"), color: "#ef4444" },
    { key: "newAITasks", label: t("newAiTasks"), color: "#2383E2" },
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-medium tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
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
          <StatCard title={t("statTotalTasks")} value={taskSummary?.totalTasks ?? 0} icon={Brain} />
          <StatCard title={t("statTokensUsed")} value={taskSummary?.totalTokens?.toLocaleString() ?? 0} icon={Zap} />
          <StatCard title={t("statImagesGenerated")} value={genSummary?.totalImages?.toLocaleString() ?? 0} icon={Sparkles} />
          <StatCard title={t("statAvgDuration")} value={`${Math.round((genSummary?.avgDurationMs ?? 0) / 1000)}s`} icon={Clock} />
        </div>

        <LineChart series={tokenSeries} title={t("tokenTrend")} height={320} />

        <div className="grid gap-4 md:grid-cols-2">
          {taskSummary && (
            <DonutChart
              data={[
                { label: t("completed"), value: taskSummary.completedTasks },
                { label: t("pending"), value: taskSummary.pendingTasks },
                { label: t("failed"), value: taskSummary.failedTasks },
              ]}
              title={t("taskStatusDistribution")}
              centerLabel={t("total")}
              centerValue={String(taskSummary.totalTasks)}
            />
          )}
          {taskSummary?.topProviders && taskSummary.topProviders.length > 0 && (
            <TreemapChart
              data={taskSummary.topProviders.map((p) => ({ label: p.provider, value: p.count }))}
              title={t("providerDistribution")}
            />
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {genSummary && (
            <BarChart
              data={[
                { label: t("images"), value: genSummary.totalImages },
                { label: t("videos"), value: genSummary.totalVideos },
                { label: t("records"), value: genSummary.totalRecords },
              ]}
              title={t("outputTypes")}
              horizontal
            />
          )}
          {taskSummary?.topProviders && taskSummary.topProviders.length > 0 && (
            <BarChart
              data={taskSummary.topProviders.map((p) => ({ label: p.provider, value: p.count }))}
              title={t("providerTaskCount")}
              horizontal
            />
          )}
        </div>
      </ClientOnly>
    </div>
  )
}
