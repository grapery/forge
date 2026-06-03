"use client"

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"

import { membershipApi } from "@/lib/api/admin"

import type { MembershipItem, MembershipSummary } from "@/lib/types"

import { PageHeader } from "@/components/shared/page-header"

import { DataTable } from "@/components/shared/data-table"

import { StatCard } from "@/components/shared/stat-card"

import { Badge } from "@/components/ui/badge"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { Users, Shield, Crown, User } from "lucide-react"


export default function MembershipsPage() {
  const t = useTranslations("memberships")
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
      <PageHeader title={t("title")} description={t("description")} icon={Crown} />

      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard title={t("statActiveMemberships")} value={summary.activeMemberships} icon={Users} />
          <StatCard title={t("statBasicMembers")} value={summary.basicMembers} icon={Shield} />
          <StatCard title={t("statPremiumMembers")} value={summary.premiumMembers} icon={Crown} />
          <StatCard title={t("statFreeMembers")} value={summary.freeMembers} icon={User} />
        </div>
      )}

      <div className="flex items-center gap-4">
        <Select value={tier || "all"} onValueChange={(v) => { setTier(v === "all" ? "" : v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("filterAllTiers")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAllTiers")}</SelectItem>
            <SelectItem value="basic">{t("filterBasic")}</SelectItem>
            <SelectItem value="premium">{t("filterPremium")}</SelectItem>
            <SelectItem value="free">{t("filterFree")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status || "all"} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("filterAllStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAllStatus")}</SelectItem>
            <SelectItem value="active">{t("filterActive")}</SelectItem>
            <SelectItem value="expired">{t("filterExpired")}</SelectItem>
            <SelectItem value="cancelled">{t("filterCancelled")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <PageSkeleton />
      ) : (
        <DataTable
          data={items}
          pagination={{ page, pageSize, total }}
          onPageChange={setPage}
          columns={[
            {
              key: "userName",
              header: t("columnUser"),
              render: (m: MembershipItem) => (
                <span className="text-sm font-medium">{m.userName}</span>
              ),
            },
            {
              key: "tier",
              header: t("columnTier"),
              render: (m: MembershipItem) => (
                <Badge variant={m.tier === "premium" ? "default" : m.tier === "basic" ? "secondary" : "outline"}>
                  {m.tier}
                </Badge>
              ),
            },
            {
              key: "status",
              header: t("columnStatus"),
              render: (m: MembershipItem) => (
                <Badge variant={m.status === "active" ? "default" : m.status === "expired" ? "secondary" : "outline"}>
                  {m.status}
                </Badge>
              ),
            },
            {
              key: "startDate",
              header: t("columnStartDate"),
              render: (m: MembershipItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(m.startDate)}</span>
              ),
            },
            {
              key: "endDate",
              header: t("columnEndDate"),
              render: (m: MembershipItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(m.endDate)}</span>
              ),
            },
            {
              key: "autoRenew",
              header: t("columnAutoRenew"),
              render: (m: MembershipItem) => (
                <Badge variant={m.autoRenew ? "default" : "secondary"}>
                  {m.autoRenew ? "Yes" : "No"}
                </Badge>
              ),
            },
            {
              key: "tokens",
              header: t("columnTokens"),
              render: (m: MembershipItem) => (
                <span className="text-sm">{m.tokenUsed}/{m.tokenQuota}</span>
              ),
            },
            {
              key: "storage",
              header: t("columnStorage"),
              render: (m: MembershipItem) => (
                <span className="text-sm">{m.storageUsed}/{m.storageQuota}</span>
              ),
            },
            {
              key: "createdAt",
              header: t("columnCreated"),
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
