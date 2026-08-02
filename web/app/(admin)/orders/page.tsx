"use client"

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"
import { useRouter, useSearchParams } from "next/navigation"
import { orderApi } from "@/lib/api/admin"
import type { SubscriptionOrderItem, OrderSummary } from "@/lib/types"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { StatCard } from "@/components/shared/stat-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DollarSign, ShoppingCart, Clock, CheckCircle, RotateCcw, Receipt, Search } from "lucide-react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { LoadErrorBanner } from "@/components/shared/load-error-banner"


const statusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "completed":
    case "paid":
      return "default"
    case "pending":
      return "secondary"
    case "failed":
      return "destructive"
    case "refunded":
    case "cancelled":
      return "outline"
    default:
      return "secondary"
  }
}

export default function OrdersPage() {
  const t = useTranslations("orders")
  const tc = useTranslations("common")
  const router = useRouter()
  const searchParams = useSearchParams()
  const userIdFromUrl = searchParams.get("userId") || ""
  const [items, setItems] = useState<SubscriptionOrderItem[]>([])
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState<OrderSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState(searchParams.get("status") || "")
  const [userIdDraft, setUserIdDraft] = useState(userIdFromUrl)
  const [userId, setUserId] = useState(userIdFromUrl)
  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") || "")
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") || "")
  const [refundReason, setRefundReason] = useState("")
  const pageSize = 20

  const [refundOrder, setRefundOrder] = useState<SubscriptionOrderItem | null>(null)
  const hasFilters = Boolean(status || userId || dateFrom || dateTo)

  useEffect(() => {
    const next = searchParams.get("userId") || ""
    setUserId(next)
    setUserIdDraft(next)
    setPage(1)
  }, [searchParams])

  const fetchData = useCallback(() => {
    setLoading(true)
    setError("")
    orderApi
      .list({
        page,
        pageSize,
        status: status || undefined,
        userId: userId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      })
      .then((data) => {
        setItems(data.items || [])
        setTotal(data.total)
      })
      .catch((err: Error) => setError(err.message || tc("loadFailed")))
      .finally(() => setLoading(false))
  }, [page, status, userId, dateFrom, dateTo, tc])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    orderApi.summary().then(setSummary).catch(() => {})
  }, [])

  const handleRefund = async () => {
    if (!refundOrder) return
    const reason = refundReason.trim() || t("toastRefundReason")
    try {
      await orderApi.refund(refundOrder.id, { reason })
      toast.success(t("toastRefunded", { id: refundOrder.id }))
      setRefundOrder(null)
      setRefundReason("")
      fetchData()
      orderApi.summary().then(setSummary).catch(() => {})
    } catch (err: any) {
      toast.error(err.message || t("toastRefundFailed"))
    }
  }

  const formatTime = (ts: number | null) => {
    if (!ts) return "-"
    return new Date(ts * 1000).toLocaleDateString()
  }

  const syncUrl = (next: { status?: string; userId?: string; dateFrom?: string; dateTo?: string }) => {
    const params = new URLSearchParams()
    const nextStatus = next.status !== undefined ? next.status : status
    const nextUserId = next.userId !== undefined ? next.userId : userId
    const nextFrom = next.dateFrom !== undefined ? next.dateFrom : dateFrom
    const nextTo = next.dateTo !== undefined ? next.dateTo : dateTo
    if (nextStatus) params.set("status", nextStatus)
    if (nextUserId) params.set("userId", nextUserId)
    if (nextFrom) params.set("dateFrom", nextFrom)
    if (nextTo) params.set("dateTo", nextTo)
    const qs = params.toString()
    router.replace(qs ? `/orders?${qs}` : "/orders")
  }

  const applyStatus = (next: string) => {
    setStatus(next)
    setPage(1)
    syncUrl({ status: next })
  }

  const applyDateFrom = (next: string) => {
    setDateFrom(next)
    setPage(1)
    syncUrl({ dateFrom: next })
  }

  const applyDateTo = (next: string) => {
    setDateTo(next)
    setPage(1)
    syncUrl({ dateTo: next })
  }

  const applyUserFilter = () => {
    const next = userIdDraft.trim()
    setUserId(next)
    setPage(1)
    syncUrl({ userId: next })
  }

  const clearUserFilter = () => {
    setUserId("")
    setUserIdDraft("")
    setPage(1)
    syncUrl({ userId: "" })
  }

  const pendingCount = summary?.pendingCount ?? summary?.pendingOrders ?? 0
  const completedCount = summary?.completedCount ?? summary?.paidOrders ?? 0

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} icon={Receipt} />

      {error && <LoadErrorBanner message={error} onRetry={fetchData} />}

      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard title={t("statTotalRevenue")} value={summary.totalRevenue} icon={DollarSign} />
          <StatCard title={t("statTotalOrders")} value={summary.totalOrders} icon={ShoppingCart} />
          <StatCard title={t("statPending")} value={pendingCount} icon={Clock} />
          <StatCard title={t("statPaid")} value={completedCount} icon={CheckCircle} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <Select value={status || "all"} onValueChange={(v) => applyStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("filterAllStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAllStatus")}</SelectItem>
            <SelectItem value="pending">{t("filterPending")}</SelectItem>
            <SelectItem value="completed">{t("filterPaid")}</SelectItem>
            <SelectItem value="failed">{t("filterFailed")}</SelectItem>
            <SelectItem value="refunded">{t("filterRefunded")}</SelectItem>
            <SelectItem value="cancelled">{t("filterCancelled")}</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Input
            value={userIdDraft}
            onChange={(e) => setUserIdDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") applyUserFilter() }}
            placeholder={t("searchUserPlaceholder")}
            className="h-9 w-56"
          />
          <Button variant="outline" size="sm" onClick={applyUserFilter}>
            <Search className="h-4 w-4" />
          </Button>
          {userId && (
            <Button variant="outline" size="sm" onClick={clearUserFilter}>
              {t("clearUserFilter")}
            </Button>
          )}
        </div>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => applyDateFrom(e.target.value)}
          className="h-9 w-40"
          aria-label={t("filterDateFrom")}
        />
        <span className="text-sm text-muted-foreground">-</span>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => applyDateTo(e.target.value)}
          className="h-9 w-40"
          aria-label={t("filterDateTo")}
        />
      </div>

      {userId && (
        <p className="text-sm text-muted-foreground">{t("filteringByUser", { id: userId })}</p>
      )}

      {loading ? (
        <PageSkeleton />
      ) : (
        <DataTable
          data={items}
          pagination={{ page, pageSize, total }}
          onPageChange={setPage}
          onRowClick={(o: SubscriptionOrderItem) => router.push(`/orders/detail?id=${o.id}`)}
          emptyTitle={hasFilters ? tc("emptyFilteredTitle") : undefined}
          emptyDescription={hasFilters ? tc("emptyFilteredDescription") : undefined}
          emptyActionLabel={hasFilters ? tc("clearFilters") : undefined}
          onEmptyAction={hasFilters ? () => {
            setStatus("")
            setUserId("")
            setUserIdDraft("")
            setDateFrom("")
            setDateTo("")
            setPage(1)
            router.replace("/orders")
          } : undefined}
          columns={[
            {
              key: "userName",
              header: t("columnUser"),
              render: (o: SubscriptionOrderItem) => (
                <button
                  type="button"
                  className="text-sm font-medium text-primary hover:underline"
                  onClick={() => router.push(`/users/detail?id=${o.userId}`)}
                >
                  {o.userName || o.userId}
                </button>
              ),
            },
            {
              key: "planName",
              header: t("columnPlan"),
              render: (o: SubscriptionOrderItem) => (
                <span className="text-sm">{o.planName}</span>
              ),
            },
            {
              key: "status",
              header: t("columnStatus"),
              render: (o: SubscriptionOrderItem) => (
                <Badge variant={statusVariant(o.status)}>{o.status}</Badge>
              ),
            },
            {
              key: "paymentMethod",
              header: t("columnPayment"),
              render: (o: SubscriptionOrderItem) => (
                <span className="text-sm">{o.paymentMethod}</span>
              ),
            },
            {
              key: "amount",
              header: t("columnAmount"),
              render: (o: SubscriptionOrderItem) => (
                <span className="text-sm">{o.currency} {o.amount}</span>
              ),
            },
            {
              key: "createdAt",
              header: t("columnCreated"),
              render: (o: SubscriptionOrderItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(o.createdAt)}</span>
              ),
            },
            {
              key: "paidAt",
              header: t("columnPaidAt"),
              render: (o: SubscriptionOrderItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(o.paidAt)}</span>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (o: SubscriptionOrderItem) =>
                o.status === "completed" || o.status === "paid" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      setRefundReason(t("toastRefundReason"))
                      setRefundOrder(o)
                    }}
                  >
                    <RotateCcw className="mr-1 h-3 w-3" />{t("buttonRefund")}
                  </Button>
                ) : null,
            },
          ]}
        />
      )}

      <ConfirmDialog
        open={!!refundOrder}
        onOpenChange={(o) => {
          if (!o) {
            setRefundOrder(null)
            setRefundReason("")
          }
        }}
        title={t("dialogRefundTitle")}
        description={t("dialogRefundDescription", { id: refundOrder?.id || "" })}
        confirmLabel={t("buttonRefund")}
        variant="destructive"
        onConfirm={handleRefund}
      >
        <div className="space-y-2 pt-2">
          <Label htmlFor="refund-reason">{t("labelRefundReason")}</Label>
          <Input
            id="refund-reason"
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            placeholder={t("placeholderRefundReason")}
          />
        </div>
      </ConfirmDialog>
    </div>
  )
}
