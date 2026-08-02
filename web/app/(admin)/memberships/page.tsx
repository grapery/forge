"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"

import { membershipApi } from "@/lib/api/admin"

import type { MembershipItem, MembershipSummary } from "@/lib/types"

import { PageHeader } from "@/components/shared/page-header"

import { DataTable } from "@/components/shared/data-table"

import { StatCard } from "@/components/shared/stat-card"

import { Badge } from "@/components/ui/badge"

import { Button } from "@/components/ui/button"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { Users, Shield, Crown, User, Sparkles, Pencil, RefreshCw, XCircle } from "lucide-react"

import { MembershipFormDialog } from "@/components/shared/membership-form-dialog"
import { AdminPage } from "@/components/layout/admin-page"


const tierVariant: Record<string, "default" | "secondary" | "outline"> = {
  premium: "default",
  pro: "default",
  basic: "secondary",
  free: "outline",
}


export default function MembershipsPage() {
  const router = useRouter()
  const t = useTranslations("memberships")
  const [items, setItems] = useState<MembershipItem[]>([])
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState<MembershipSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [tier, setTier] = useState("")
  const [status, setStatus] = useState("")
  const pageSize = 20

  const [editTarget, setEditTarget] = useState<MembershipItem | null>(null)
  const [renewTarget, setRenewTarget] = useState<MembershipItem | null>(null)
  const [cancelTarget, setCancelTarget] = useState<MembershipItem | null>(null)

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

  const refreshAfterMutation = useCallback(() => {
    fetchData()
    membershipApi.summary().then(setSummary).catch(() => {})
  }, [fetchData])

  const formatTime = (ts: number | null) => {
    if (!ts) return "-"
    return new Date(ts * 1000).toLocaleDateString()
  }

  return (
    <AdminPage>
      <PageHeader title={t("title")} description={t("description")} icon={Crown} />

      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard title={t("statActiveMemberships")} value={summary.totalActive} icon={Users} />
          <StatCard title={t("statBasicMembers")} value={summary.basicCount} icon={Shield} />
          <StatCard title={t("statPremiumMembers")} value={summary.premiumCount} icon={Crown} />
          <StatCard title={t("statFreeMembers")} value={summary.freeCount} icon={User} />
        </div>
      )}

      <div className="flex items-center gap-4">
        <Select value={tier || "all"} onValueChange={(v) => { setTier(v === "all" ? "" : v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("filterAllTiers")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAllTiers")}</SelectItem>
            <SelectItem value="free">{t("filterFree")}</SelectItem>
            <SelectItem value="basic">{t("filterBasic")}</SelectItem>
            <SelectItem value="pro">{t("filterPro")}</SelectItem>
            <SelectItem value="premium">{t("filterPremium")}</SelectItem>
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
          onRowClick={(m) => router.push(`/users/detail?id=${m.userId}`)}
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
                <Badge variant={tierVariant[m.tier] || "outline"}>
                  {m.tier === "premium" || m.tier === "pro" ? <Sparkles className="mr-1 h-3 w-3" /> : null}
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
              render: (m: MembershipItem) => {
                const pct = m.tokenQuota > 0 ? Math.min(100, Math.round((m.tokenUsed / m.tokenQuota) * 100)) : 0
                return (
                  <div className="flex flex-col gap-1 min-w-[100px]">
                    <span className="text-xs">{m.tokenUsed}/{m.tokenQuota}</span>
                    <div className="h-1 rounded bg-secondary/60 overflow-hidden">
                      <div className="h-full bg-primary/70" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              },
            },
            {
              key: "createdAt",
              header: t("columnCreated"),
              render: (m: MembershipItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(m.createdAt)}</span>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (m: MembershipItem) => (
                <div className="flex gap-1">
                  {m.status === "active" && (
                    <>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEditTarget(m) }}>
                        <Pencil className="mr-1 h-3 w-3" />{t("buttonEdit")}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setRenewTarget(m) }}>
                        <RefreshCw className="mr-1 h-3 w-3" />{t("buttonRenew")}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={(e) => { e.stopPropagation(); setCancelTarget(m) }}>
                        <XCircle className="mr-1 h-3 w-3" />{t("buttonCancelMembership")}
                      </Button>
                    </>
                  )}
                </div>
              ),
            },
          ]}
        />
      )}

      <p className="text-xs text-muted-foreground">{t("rowClickHint")}</p>

      <MembershipFormDialog
        mode="upsert"
        open={!!editTarget}
        onOpenChange={(o) => { if (!o) setEditTarget(null) }}
        userId={editTarget?.userId || ""}
        initial={editTarget}
        onSubmitted={refreshAfterMutation}
      />

      <MembershipFormDialog
        mode="renew"
        open={!!renewTarget}
        onOpenChange={(o) => { if (!o) setRenewTarget(null) }}
        userId={renewTarget?.userId || ""}
        membershipId={renewTarget?.id}
        onSubmitted={refreshAfterMutation}
      />

      <MembershipFormDialog
        mode="cancel"
        open={!!cancelTarget}
        onOpenChange={(o) => { if (!o) setCancelTarget(null) }}
        userId={cancelTarget?.userId || ""}
        membershipId={cancelTarget?.id}
        onSubmitted={refreshAfterMutation}
      />
    </AdminPage>
  )
}

