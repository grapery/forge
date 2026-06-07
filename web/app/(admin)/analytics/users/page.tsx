"use client"

import { useEffect, useState } from "react"
import { userApi, dashboardApi, deviceApi } from "@/lib/api/admin"
import { StatCard } from "@/components/shared/stat-card"
import { Users, UserCheck, UserX, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageSkeleton } from "@/components/shared/skeleton"
import { LineChart } from "@/components/charts/line-chart"
import { DonutChart } from "@/components/charts/donut-chart"
import { BarChart } from "@/components/charts/bar-chart"
import { HeatmapCalendar } from "@/components/charts/heatmap-calendar"
import { ClientOnly } from "@/components/charts/client-only"
import { dailyTrendToSeries } from "@/lib/chart-data"
import { useTranslations } from "next-intl"
import type { DailyTrend, UserStatusCount, DevicePlatformCount, OverviewStats } from "@/lib/types"

type Range = "7d" | "30d" | "90d"

export default function UserAnalyticsPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [userCounts, setUserCounts] = useState<UserStatusCount | null>(null)
  const [deviceCounts, setDeviceCounts] = useState<DevicePlatformCount | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<Range>("30d")

  const t = useTranslations("analyticsUsers")
  const dt = useTranslations("dashboard")

  useEffect(() => {
    setLoading(true)
    Promise.all([dashboardApi.getOverview(range), userApi.statusCounts(), deviceApi.platformCounts()])
      .then(([s, u, d]) => { setStats(s); setUserCounts(u); setDeviceCounts(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [range])

  if (loading) return <PageSkeleton />

  const trends = stats?.trends || []

  const growthSeries = dailyTrendToSeries(trends, [
    { key: "newUsers", label: t("newUsers"), color: "#7A39EC" },
    { key: "totalUsers", label: t("totalUsersSeries"), color: "#8b5cf6" },
  ])

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
          <StatCard title={t("statTotalUsers")} value={stats?.totalUsers ?? 0} icon={Users} />
          <StatCard title={t("statActive")} value={userCounts?.active ?? 0} icon={UserCheck} />
          <StatCard title={t("statSuspended")} value={userCounts?.suspended ?? 0} icon={UserX} />
          <StatCard title={t("statDevices")} value={(deviceCounts?.ios ?? 0) + (deviceCounts?.android ?? 0)} icon={Smartphone} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <LineChart series={growthSeries} title={t("growthTrend")} height={300} />
          {userCounts && (
            <DonutChart
              data={[
                { label: t("statActive"), value: userCounts.active },
                { label: t("statSuspended"), value: userCounts.suspended },
                { label: t("chartDeleted"), value: userCounts.deleted },
              ]}
              title={t("statusDistribution")}
              centerLabel={t("total")}
              centerValue={String(userCounts.active + userCounts.suspended + userCounts.deleted)}
            />
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {deviceCounts && (
            <BarChart
              data={[
                { label: t("ios"), value: deviceCounts.ios },
                { label: t("android"), value: deviceCounts.android },
                { label: t("other"), value: deviceCounts.other },
              ]}
              title={t("devicePlatform")}
              horizontal
            />
          )}
          <HeatmapCalendar
            data={trends.map((tr) => ({ date: tr.date, value: tr.newUsers }))}
            title={t("registrationActivity")}
            weeks={12}
          />
        </div>
      </ClientOnly>
    </div>
  )
}
