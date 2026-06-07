"use client"

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"

import { tokenApi } from "@/lib/api/admin"

import type { TokenTransactionItem, TokenSummary } from "@/lib/types"

import { PageHeader } from "@/components/shared/page-header"

import { DataTable } from "@/components/shared/data-table"

import { StatCard } from "@/components/shared/stat-card"

import { Badge } from "@/components/ui/badge"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { Coins, ArrowDown, ArrowUp, RotateCcw, Gift } from "lucide-react"


export default function TokensPage() {
  const t = useTranslations("tokens")
  const [items, setItems] = useState<TokenTransactionItem[]>([])
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState<TokenSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [type, setType] = useState("")
  const pageSize = 20

  const fetchData = useCallback(() => {
    setLoading(true)
    tokenApi
      .list({
        page,
        pageSize,
        type: type || undefined,
      })
      .then((data) => {
        setItems(data.items || [])
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, type])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    tokenApi.summary().then(setSummary).catch(() => {})
  }, [])

  const formatTime = (ts: number | null) => {
    if (!ts) return "-"
    return new Date(ts * 1000).toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} icon={Coins} />

      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard title={t("statConsumed")} value={summary.totalConsumed} icon={ArrowDown} />
          <StatCard title={t("statRecharged")} value={summary.totalRecharged} icon={ArrowUp} />
          <StatCard title={t("statRefunded")} value={summary.totalRefunded} icon={RotateCcw} />
          <StatCard title={t("statGifted")} value={summary.totalGifted} icon={Coins} />
        </div>
      )}

      <div className="flex items-center gap-4">
        <Select value={type || "all"} onValueChange={(v) => { setType(v === "all" ? "" : v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("filterAllTypes")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAllTypes")}</SelectItem>
            <SelectItem value="consumed">{t("filterConsumed")}</SelectItem>
            <SelectItem value="recharged">{t("filterRecharged")}</SelectItem>
            <SelectItem value="refunded">{t("filterRefunded")}</SelectItem>
            <SelectItem value="gifted">{t("filterGifted")}</SelectItem>
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
              render: (t: TokenTransactionItem) => (
                <span className="text-sm font-medium">{t.userName}</span>
              ),
            },
            {
              key: "type",
              header: t("columnType"),
              render: (t: TokenTransactionItem) => (
                <Badge variant={t.type === "consumed" ? "secondary" : t.type === "recharged" ? "default" : t.type === "gifted" ? "outline" : "secondary"}>
                  {t.type}
                </Badge>
              ),
            },
            {
              key: "amount",
              header: t("columnAmount"),
              render: (t: TokenTransactionItem) => (
                <span className={`text-sm font-medium ${t.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {t.amount >= 0 ? "+" : ""}{t.amount}
                </span>
              ),
            },
            {
              key: "balance",
              header: t("columnBalance"),
              render: (t: TokenTransactionItem) => (
                <span className="text-sm">{t.balance}</span>
              ),
            },
            {
              key: "source",
              header: t("columnSource"),
              render: (t: TokenTransactionItem) => (
                <span className="text-sm text-muted-foreground">{t.source || "-"}</span>
              ),
            },
            {
              key: "description",
              header: t("columnDescription"),
              render: (t: TokenTransactionItem) => (
                <span className="text-xs text-muted-foreground">{t.description || "-"}</span>
              ),
            },
            {
              key: "relatedId",
              header: t("columnRelatedId"),
              render: (t: TokenTransactionItem) => (
                <span className="text-xs text-muted-foreground">{t.relatedId || "-"}</span>
              ),
            },
            {
              key: "createdAt",
              header: t("columnCreated"),
              render: (t: TokenTransactionItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(t.createdAt)}</span>
              ),
            },
          ]}
        />
      )}
    </div>
  )
}
