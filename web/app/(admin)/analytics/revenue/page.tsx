"use client"

import { useEffect, useState } from "react"
import { dashboardApi, orderApi, membershipApi, tokenApi } from "@/lib/api/admin"
import { StatCard } from "@/components/shared/stat-card"
import { CreditCard, Receipt, Coins, TrendingUp } from "lucide-react"
import { PageSkeleton } from "@/components/shared/skeleton"
import { LineChart } from "@/components/charts/line-chart"
import { DonutChart } from "@/components/charts/donut-chart"
import { BarChart } from "@/components/charts/bar-chart"
import { FunnelChart } from "@/components/charts/funnel-chart"
import { SankeyChart } from "@/components/charts/sankey-chart"
import { ClientOnly } from "@/components/charts/client-only"
import { dailyTrendToSeries } from "@/lib/chart-data"
import { useTranslations } from "next-intl"
import type { OverviewStats, OrderSummary, MembershipSummary, TokenSummary } from "@/lib/types"

type Range = "7d" | "30d" | "90d"

export default function RevenueAnalyticsPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null)
  const [memberSummary, setMemberSummary] = useState<MembershipSummary | null>(null)
  const [tokenSummary, setTokenSummary] = useState<TokenSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<Range>("30d")

  const t = useTranslations("analyticsRevenue")
  const dt = useTranslations("dashboard")

  useEffect(() => {
    setLoading(true)
    Promise.all([dashboardApi.getOverview(range), orderApi.summary(), membershipApi.summary(), tokenApi.summary()])
      .then(([s, o, m, ts]) => { setStats(s); setOrderSummary(o); setMemberSummary(m); setTokenSummary(ts) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [range])

  if (loading) return <PageSkeleton />

  const trends = stats?.trends || []

  const revenueSeries = dailyTrendToSeries(trends, [
    { key: "newRevenue", label: t("revenue"), color: "#10b981" },
    { key: "newOrders", label: t("orders"), color: "#2383E2" },
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
          <StatCard title={t("statTotalRevenue")} value={`$${orderSummary?.totalRevenue?.toLocaleString() ?? 0}`} icon={CreditCard} />
          <StatCard title={t("statTotalOrders")} value={orderSummary?.totalOrders ?? 0} icon={Receipt} />
          <StatCard title={t("statActiveMembers")} value={memberSummary?.totalActive ?? 0} icon={TrendingUp} />
          <StatCard title={t("statTokensConsumed")} value={tokenSummary?.totalConsumed?.toLocaleString() ?? 0} icon={Coins} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <LineChart series={revenueSeries} title={t("revenueTrend")} height={300} />
          {orderSummary && (
            <FunnelChart
              data={[
                { label: t("totalOrders"), value: orderSummary.totalOrders },
                { label: t("paid"), value: orderSummary.completedCount ?? orderSummary.paidOrders ?? 0 },
                { label: t("pending"), value: orderSummary.pendingCount ?? orderSummary.pendingOrders ?? 0 },
              ]}
              title={t("orderFunnel")}
            />
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {memberSummary && (
            <DonutChart
              data={[
                { label: t("free"), value: memberSummary.freeCount },
                { label: t("basic"), value: memberSummary.basicCount },
                { label: t("pro"), value: memberSummary.proCount },
                { label: t("premium"), value: memberSummary.premiumCount },
              ]}
              title={t("membershipDistribution")}
              centerLabel={t("active")}
              centerValue={String(memberSummary.totalActive)}
            />
          )}
          {tokenSummary && (
            <SankeyChart
              nodes={[
                { name: t("recharged") },
                { name: t("gifted") },
                { name: t("consumed") },
                { name: t("refunded") },
                { name: t("aiTasks") },
                { name: t("generation") },
              ]}
              links={[
                { source: t("recharged"), target: t("consumed"), value: Math.min(tokenSummary.totalRecharged, tokenSummary.totalConsumed) },
                { source: t("gifted"), target: t("consumed"), value: Math.min(tokenSummary.totalGifted, tokenSummary.totalConsumed) },
                { source: t("consumed"), target: t("aiTasks"), value: Math.floor(tokenSummary.totalConsumed * 0.6) },
                { source: t("consumed"), target: t("generation"), value: Math.floor(tokenSummary.totalConsumed * 0.4) },
                { source: t("refunded"), target: t("consumed"), value: tokenSummary.totalRefunded },
              ]}
              title={t("tokenEconomyFlow")}
            />
          )}
        </div>
      </ClientOnly>
    </div>
  )
}
