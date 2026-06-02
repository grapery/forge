"use client"

import { useEffect, useState, useCallback } from "react"
import { tokenApi } from "@/lib/api/admin"
import type { TokenTransactionItem, TokenSummary } from "@/lib/types"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { StatCard } from "@/components/shared/stat-card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Coins, ArrowDown, ArrowUp, RotateCcw, Gift } from "lucide-react"

export default function TokensPage() {
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
      <PageHeader title="Tokens" description="Token transaction history" icon={Coins} />

      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard title="Consumed" value={summary.totalConsumed} icon={ArrowDown} />
          <StatCard title="Recharged" value={summary.totalRecharged} icon={ArrowUp} />
          <StatCard title="Refunded" value={summary.totalRefunded} icon={RotateCcw} />
          <StatCard title="Gifted" value={summary.totalGifted} icon={Coins} />
        </div>
      )}

      <div className="flex items-center gap-4">
        <Select value={type || "all"} onValueChange={(v) => { setType(v === "all" ? "" : v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="consumed">Consumed</SelectItem>
            <SelectItem value="recharged">Recharged</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
            <SelectItem value="gifted">Gifted</SelectItem>
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
              render: (t: TokenTransactionItem) => (
                <span className="text-sm font-medium">{t.userName}</span>
              ),
            },
            {
              key: "type",
              header: "Type",
              render: (t: TokenTransactionItem) => (
                <Badge variant={t.type === "consumed" ? "secondary" : t.type === "recharged" ? "default" : t.type === "gifted" ? "outline" : "secondary"}>
                  {t.type}
                </Badge>
              ),
            },
            {
              key: "amount",
              header: "Amount",
              render: (t: TokenTransactionItem) => (
                <span className={`text-sm font-medium ${t.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {t.amount >= 0 ? "+" : ""}{t.amount}
                </span>
              ),
            },
            {
              key: "balance",
              header: "Balance",
              render: (t: TokenTransactionItem) => (
                <span className="text-sm">{t.balance}</span>
              ),
            },
            {
              key: "source",
              header: "Source",
              render: (t: TokenTransactionItem) => (
                <span className="text-sm text-muted-foreground">{t.source || "-"}</span>
              ),
            },
            {
              key: "description",
              header: "Description",
              render: (t: TokenTransactionItem) => (
                <span className="text-xs text-muted-foreground">{t.description || "-"}</span>
              ),
            },
            {
              key: "relatedId",
              header: "Related ID",
              render: (t: TokenTransactionItem) => (
                <span className="text-xs text-muted-foreground">{t.relatedId || "-"}</span>
              ),
            },
            {
              key: "createdAt",
              header: "Created",
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
