"use client"

import { useEffect, useState, useCallback } from "react"
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
import type { DailyTrend, UserStatusCount, DevicePlatformCount, OverviewStats } from "@/lib/types"

type Range = "7d" | "30d" | "90d"

export default function UserAnalyticsPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [userCounts, setUserCounts] = useState<UserStatusCount | null>(null)
  const [deviceCounts, setDeviceCounts] = useState<DevicePlatformCount | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<Range>("30d")

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
    { key: "newUsers", label: "New Users", color: "#3b82f6" },
    { key: "totalUsers", label: "Total Users", color: "#8b5cf6" },
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Analytics</h1>
          <p className="text-muted-foreground">User growth, engagement, and platform distribution</p>
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
          <StatCard title="Total Users" value={stats?.totalUsers ?? 0} icon={Users} />
          <StatCard title="Active" value={userCounts?.active ?? 0} icon={UserCheck} />
          <StatCard title="Suspended" value={userCounts?.suspended ?? 0} icon={UserX} />
          <StatCard title="Devices" value={(deviceCounts?.ios ?? 0) + (deviceCounts?.android ?? 0)} icon={Smartphone} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <LineChart series={growthSeries} title="User Growth Trend" height={300} />
          {userCounts && (
            <DonutChart
              data={[
                { label: "Active", value: userCounts.active },
                { label: "Suspended", value: userCounts.suspended },
                { label: "Deleted", value: userCounts.deleted },
              ]}
              title="User Status Distribution"
              centerLabel="Total"
              centerValue={String(userCounts.active + userCounts.suspended + userCounts.deleted)}
            />
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {deviceCounts && (
            <BarChart
              data={[
                { label: "iOS", value: deviceCounts.ios },
                { label: "Android", value: deviceCounts.android },
                { label: "Other", value: deviceCounts.other },
              ]}
              title="Device Platform"
              horizontal
            />
          )}
          <HeatmapCalendar
            data={trends.map((t) => ({ date: t.date, value: t.newUsers }))}
            title="Registration Activity"
            weeks={12}
          />
        </div>
      </ClientOnly>
    </div>
  )
}
