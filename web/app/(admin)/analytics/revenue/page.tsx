"use client"

import { useEffect, useState } from "react"
import { dashboardApi, orderApi, membershipApi, tokenApi } from "@/lib/api/admin"
import { StatCard } from "@/components/shared/stat-card"
import { CreditCard, Receipt, Coins, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageSkeleton } from "@/components/shared/skeleton"
import { LineChart } from "@/components/charts/line-chart"
import { DonutChart } from "@/components/charts/donut-chart"
import { BarChart } from "@/components/charts/bar-chart"
import { FunnelChart } from "@/components/charts/funnel-chart"
import { SankeyChart } from "@/components/charts/sankey-chart"
import { ClientOnly } from "@/components/charts/client-only"
import { dailyTrendToSeries } from "@/lib/chart-data"
import type { OverviewStats, OrderSummary, MembershipSummary, TokenSummary } from "@/lib/types"

type Range = "7d" | "30d" | "90d"

export default function RevenueAnalyticsPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null)
  const [memberSummary, setMemberSummary] = useState<MembershipSummary | null>(null)
  const [tokenSummary, setTokenSummary] = useState<TokenSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<Range>("30d")

  useEffect(() => {
    setLoading(true)
    Promise.all([dashboardApi.getOverview(range), orderApi.summary(), membershipApi.summary(), tokenApi.summary()])
      .then(([s, o, m, t]) => { setStats(s); setOrderSummary(o); setMemberSummary(m); setTokenSummary(t) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [range])

  if (loading) return <PageSkeleton />

  const trends = stats?.trends || []

  const revenueSeries = dailyTrendToSeries(trends, [
    { key: "newRevenue", label: "Revenue", color: "#10b981" },
    { key: "newOrders", label: "Orders", color: "#3b82f6" },
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Revenue Analytics</h1>
          <p className="text-muted-foreground">Revenue trends, subscriptions, and token economy</p>
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
          <StatCard title="Total Revenue" value={`$${orderSummary?.totalRevenue?.toLocaleString() ?? 0}`} icon={CreditCard} />
          <StatCard title="Total Orders" value={orderSummary?.totalOrders ?? 0} icon={Receipt} />
          <StatCard title="Active Members" value={memberSummary?.activeMemberships ?? 0} icon={TrendingUp} />
          <StatCard title="Tokens Consumed" value={tokenSummary?.totalConsumed?.toLocaleString() ?? 0} icon={Coins} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <LineChart series={revenueSeries} title="Revenue & Order Trend" height={300} />
          {orderSummary && (
            <FunnelChart
              data={[
                { label: "Total Orders", value: orderSummary.totalOrders },
                { label: "Paid", value: orderSummary.paidOrders },
                { label: "Pending", value: orderSummary.pendingOrders },
              ]}
              title="Order Funnel"
            />
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {memberSummary && (
            <DonutChart
              data={[
                { label: "Free", value: memberSummary.freeMembers },
                { label: "Basic", value: memberSummary.basicMembers },
                { label: "Premium", value: memberSummary.premiumMembers },
              ]}
              title="Membership Tier Distribution"
              centerLabel="Active"
              centerValue={String(memberSummary.activeMemberships)}
            />
          )}
          {tokenSummary && (
            <SankeyChart
              nodes={[
                { name: "Recharged" },
                { name: "Gifted" },
                { name: "Consumed" },
                { name: "Refunded" },
                { name: "AI Tasks" },
                { name: "Generation" },
              ]}
              links={[
                { source: "Recharged", target: "Consumed", value: Math.min(tokenSummary.totalRecharged, tokenSummary.totalConsumed) },
                { source: "Gifted", target: "Consumed", value: Math.min(tokenSummary.totalGifted, tokenSummary.totalConsumed) },
                { source: "Consumed", target: "AI Tasks", value: Math.floor(tokenSummary.totalConsumed * 0.6) },
                { source: "Consumed", target: "Generation", value: Math.floor(tokenSummary.totalConsumed * 0.4) },
                { source: "Refunded", target: "Consumed", value: tokenSummary.totalRefunded },
              ]}
              title="Token Economy Flow"
            />
          )}
        </div>
      </ClientOnly>
    </div>
  )
}
