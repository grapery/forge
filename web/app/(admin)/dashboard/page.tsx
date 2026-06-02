"use client"

import { useEffect, useState } from "react"
import { dashboardApi } from "@/lib/api/admin"
import { StatCard } from "@/components/shared/stat-card"
import { Users, BookOpen, Layers, Puzzle, UserCircle, Brain, CreditCard, Receipt, Coins, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import type { OverviewStats, DailyTrend } from "@/lib/types"

function MiniBarChart({ data, valueKey, label, color }: { data: DailyTrend[]; valueKey: keyof DailyTrend; label: string; color: string }) {
  const values = data.map((d) => Number(d[valueKey]) || 0)
  const max = Math.max(...values, 1)
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-1 h-24">
          {values.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t transition-all"
                style={{
                  height: `${(v / max) * 100}%`,
                  minHeight: v > 0 ? "4px" : "0",
                  backgroundColor: color,
                }}
              />
              <span className="text-[9px] text-muted-foreground truncate w-full text-center">
                {data[i]?.date?.slice(5) || ""}
              </span>
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

  const fetchData = () => {
    setLoading(true)
    setError("")
    dashboardApi
      .getOverview()
      .then(setStats)
      .catch((err) => setError(err.message || "Failed to load stats"))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCollect = async () => {
    setCollecting(true)
    try {
      await dashboardApi.collectStats()
      toast.success("Stats collected successfully")
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Failed to collect stats")
    } finally {
      setCollecting(false)
    }
  }

  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading stats...</div>

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Platform overview</p>
          </div>
        </div>
        <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
      </div>
    )
  }

  const trends = stats?.trends || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Platform overview</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleCollect} disabled={collecting}>
          <RefreshCw className={`mr-2 h-4 w-4 ${collecting ? "animate-spin" : ""}`} />
          {collecting ? "Collecting..." : "Collect Stats"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <StatCard title="Total Users" value={stats?.totalUsers ?? 0} icon={Users} />
        <StatCard title="Total Stories" value={stats?.totalStories ?? 0} icon={BookOpen} />
        <StatCard title="Total Storyboards" value={stats?.totalStoryboards ?? 0} icon={Layers} />
        <StatCard title="Total Fragments" value={stats?.totalFragments ?? 0} icon={Puzzle} />
        <StatCard title="Total Characters" value={stats?.totalCharacters ?? 0} icon={UserCircle} />
        <StatCard title="AI Tasks" value={stats?.totalAITasks ?? 0} icon={Brain} />
        <StatCard title="Active Memberships" value={stats?.activeMemberships ?? 0} icon={CreditCard} />
        <StatCard title="Total Orders" value={stats?.totalOrders ?? 0} icon={Receipt} />
        <StatCard title="Token Transactions" value={stats?.totalTokenTransactions ?? 0} icon={Coins} />
      </div>

      {trends.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Trends (Last {trends.length} Days)</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <MiniBarChart data={trends} valueKey="newUsers" label="New Users / Day" color="#3b82f6" />
            <MiniBarChart data={trends} valueKey="newStories" label="New Stories / Day" color="#8b5cf6" />
            <MiniBarChart data={trends} valueKey="newOrders" label="New Orders / Day" color="#10b981" />
          </div>
        </div>
      )}

      {trends.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>No trend data yet. Click &quot;Collect Stats&quot; to gather daily statistics.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
