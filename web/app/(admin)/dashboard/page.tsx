"use client"

import { useEffect, useState } from "react"
import { dashboardApi } from "@/lib/api/admin"
import { StatCard } from "@/components/shared/stat-card"
import { Users, BookOpen, Layers, Puzzle, UserCircle } from "lucide-react"
import type { OverviewStats } from "@/lib/types"

export default function DashboardPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    dashboardApi
      .getOverview()
      .then(setStats)
      .catch((err) => setError(err.message || "Failed to load stats"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div>Loading stats...</div>

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Platform overview</p>
        </div>
        <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Platform overview</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Total Users" value={stats?.totalUsers ?? 0} icon={Users} />
        <StatCard title="Total Stories" value={stats?.totalStories ?? 0} icon={BookOpen} />
        <StatCard title="Total Storyboards" value={stats?.totalStoryboards ?? 0} icon={Layers} />
        <StatCard title="Total Fragments" value={stats?.totalFragments ?? 0} icon={Puzzle} />
        <StatCard title="Total Characters" value={stats?.totalCharacters ?? 0} icon={UserCircle} />
      </div>
    </div>
  )
}
