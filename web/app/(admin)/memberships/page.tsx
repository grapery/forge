"use client"

import { useEffect, useState, useCallback } from "react"
import { membershipApi } from "@/lib/api/admin"
import type { MembershipItem, MembershipSummary } from "@/lib/types"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { StatCard } from "@/components/shared/stat-card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Shield, Crown, User } from "lucide-react"

export default function MembershipsPage() {
  const [items, setItems] = useState<MembershipItem[]>([])
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState<MembershipSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [tier, setTier] = useState("")
  const [status, setStatus] = useState("")
  const pageSize = 20

  const fetchData = useCallback(() => {
    setLoading(true)
    membershipApi
      .list({
        page,
        pageSize,
        tier: tier || undefined,
        status: status || undefined,
      })
      .then((data) => {
        setItems(data.items || [])
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, tier, status])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    membershipApi.summary().then(setSummary).catch(() => {})
  }, [])

  const formatTime = (ts: number | null) => {
    if (!ts) return "-"
    return new Date(ts * 1000).toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Memberships" description="Manage user memberships" icon={Crown} />

      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard title="Active Memberships" value={summary.activeMemberships} icon={Users} />
          <StatCard title="Basic Members" value={summary.basicMembers} icon={Shield} />
          <StatCard title="Premium Members" value={summary.premiumMembers} icon={Crown} />
          <StatCard title="Free Members" value={summary.freeMembers} icon={User} />
        </div>
      )}

      <div className="flex items-center gap-4">
        <Select value={tier || "all"} onValueChange={(v) => { setTier(v === "all" ? "" : v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Tiers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="basic">Basic</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
            <SelectItem value="free">Free</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status || "all"} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading...</div>
      ) : (
        <DataTable
          data={items}
          pagination={{ page, pageSize, total }}
          onPageChange={setPage}
          columns={[
            {
              key: "userName",
              header: "User",
              render: (m: MembershipItem) => (
                <span className="text-sm font-medium">{m.userName}</span>
              ),
            },
            {
              key: "tier",
              header: "Tier",
              render: (m: MembershipItem) => (
                <Badge variant={m.tier === "premium" ? "default" : m.tier === "basic" ? "secondary" : "outline"}>
                  {m.tier}
                </Badge>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (m: MembershipItem) => (
                <Badge variant={m.status === "active" ? "default" : m.status === "expired" ? "secondary" : "outline"}>
                  {m.status}
                </Badge>
              ),
            },
            {
              key: "startDate",
              header: "Start Date",
              render: (m: MembershipItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(m.startDate)}</span>
              ),
            },
            {
              key: "endDate",
              header: "End Date",
              render: (m: MembershipItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(m.endDate)}</span>
              ),
            },
            {
              key: "autoRenew",
              header: "Auto Renew",
              render: (m: MembershipItem) => (
                <Badge variant={m.autoRenew ? "default" : "secondary"}>
                  {m.autoRenew ? "Yes" : "No"}
                </Badge>
              ),
            },
            {
              key: "tokens",
              header: "Tokens",
              render: (m: MembershipItem) => (
                <span className="text-sm">{m.tokenUsed}/{m.tokenQuota}</span>
              ),
            },
            {
              key: "storage",
              header: "Storage",
              render: (m: MembershipItem) => (
                <span className="text-sm">{m.storageUsed}/{m.storageQuota}</span>
              ),
            },
            {
              key: "createdAt",
              header: "Created",
              render: (m: MembershipItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(m.createdAt)}</span>
              ),
            },
          ]}
        />
      )}
    </div>
  )
}
