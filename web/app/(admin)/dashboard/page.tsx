"use client"

import { useEffect, useState } from "react"
import { dashboardApi } from "@/lib/api/admin"
import { StatCard } from "@/components/shared/stat-card"
import { Users, BookOpen, Layers, Puzzle, UserCircle, Brain, CreditCard, Receipt, Coins, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageSkeleton } from "@/components/shared/skeleton"
import { toast } from "sonner"
import type { OverviewStats, DailyTrend } from "@/lib/types"

function MiniBarChart({ data, valueKey, label, color }: { data: DailyTrend[]; valueKey: keyof DailyTrend; label: string; color: string }) {
  const values = data.map((d) => Number(d[valueKey]) || 0)
  const max = Math.max(...values, 1)
  return (
    <Card className="animate-fade-in-up hover:shadow-md transition-shadow duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-1 h-24">
          {values.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div
                className="w-full rounded-t transition-all duration-500"
                style={{
                  height: `${(v / max) * 100}%`,
                  minHeight: v > 0 ? "4px" : "0",
                  backgroundColor: color,
                  transitionDelay: `${i * 40}ms`,
                }}
              />
              {v > 0 && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-medium text-foreground bg-card border shadow-sm rounded px-1.5 py-0.5 pointer-events-none">
                  {v.toLocaleString()}
                </div>
              )}
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

  if (loading) return <PageSkeleton />

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
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

  const statCards = [
    { title: "Total Users", value: stats?.totalUsers ?? 0, icon: Users },
    { title: "Total Stories", value: stats?.totalStories ?? 0, icon: BookOpen },
    { title: "Total Storyboards", value: stats?.totalStoryboards ?? 0, icon: Layers },
    { title: "Total Fragments", value: stats?.totalFragments ?? 0, icon: Puzzle },
    { title: "Total Characters", value: stats?.totalCharacters ?? 0, icon: UserCircle },
    { title: "AI Tasks", value: stats?.totalAITasks ?? 0, icon: Brain },
    { title: "Active Memberships", value: stats?.activeMemberships ?? 0, icon: CreditCard },
    { title: "Total Orders", value: stats?.totalOrders ?? 0, icon: Receipt },
    { title: "Token Transactions", value: stats?.totalTokenTransactions ?? 0, icon: Coins },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Platform overview</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleCollect} disabled={collecting} className="active:scale-[0.97] transition-all duration-200">
          <RefreshCw className={`mr-2 h-4 w-4 ${collecting ? "animate-spin" : ""}`} />
          {collecting ? "Collecting..." : "Collect Stats"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {statCards.map((card, i) => (
          <div key={card.title} className="animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
            <StatCard title={card.title} value={card.value} icon={card.icon} />
          </div>
        ))}
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
