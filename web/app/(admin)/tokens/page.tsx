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

import { Input } from "@/components/ui/input"

import { SearchInput } from "@/components/shared/search-input"

import { Coins, ArrowDown, ArrowUp, RotateCcw, Gift } from "lucide-react"


export default function TokensPage() {
  const t = useTranslations("tokens")
  const [items, setItems] = useState<TokenTransactionItem[]>([])
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState<TokenSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [type, setType] = useState("")
  const [keyword, setKeyword] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [userId, setUserId] = useState("")
  const pageSize = 20

  const fetchData = useCallback(() => {
    setLoading(true)
    tokenApi
      .list({
        page,
        pageSize,
        type: type || undefined,
        keyword: keyword || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        userId: userId || undefined,
      })
      .then((data) => {
        setItems(data.items || [])
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, type, keyword, dateFrom, dateTo, userId])

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
          <StatCard title={t("statGifted")} value={summary.totalGifted} icon={Gift} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <div className="w-64">
          <SearchInput
            value={keyword}
            onSearch={(v) => { setKeyword(v); setPage(1) }}
            placeholder={t("searchPlaceholder")}
          />
        </div>

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

      <div className="flex flex-wrap items-center gap-4">
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
          className="w-40"
          placeholder={t("filterDateFrom")}
        />
        <span className="text-sm text-muted-foreground">-</span>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
          className="w-40"
          placeholder={t("filterDateTo")}
        />
        <Input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          onBlur={() => setPage(1)}
          placeholder={t("filterUser")}
          className="w-48"
        />
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
              render: (item: TokenTransactionItem) => (
                <span className="text-sm font-medium">{item.userName}</span>
              ),
            },
            {
              key: "type",
              header: t("columnType"),
              render: (item: TokenTransactionItem) => (
                <Badge variant={item.type === "consume" || item.type === "deduct" ? "secondary" : item.type === "grant" || item.type === "purchase" ? "default" : "outline"}>
                  {item.type}
                </Badge>
              ),
            },
            {
              key: "amount",
              header: t("columnAmount"),
              render: (item: TokenTransactionItem) => (
                <span className={`text-sm font-medium ${item.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {item.amount >= 0 ? "+" : ""}{item.amount}
                </span>
              ),
            },
            {
              key: "balance",
              header: t("columnBalance"),
              render: (item: TokenTransactionItem) => (
                <span className="text-sm">{item.balance}</span>
              ),
            },
            {
              key: "description",
              header: t("columnDescription"),
              render: (item: TokenTransactionItem) => (
                <span className="text-xs text-muted-foreground max-w-[200px] truncate block" title={item.description}>
                  {item.description || "-"}
                </span>
              ),
            },
            {
              key: "referenceId",
              header: t("columnRelatedId"),
              render: (item: TokenTransactionItem) => (
                <span className="text-xs text-muted-foreground">{item.referenceId || "-"}</span>
              ),
            },
            {
              key: "createdAt",
              header: t("columnCreated"),
              render: (item: TokenTransactionItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(item.createdAt)}</span>
              ),
            },
          ]}
        />
      )}
    </div>
  )
}
