"use client"

import { useEffect, useState, useCallback } from "react"
import { orderApi } from "@/lib/api/admin"
import type { SubscriptionOrderItem, OrderSummary } from "@/lib/types"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { StatCard } from "@/components/shared/stat-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DollarSign, ShoppingCart, Clock, CheckCircle, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"

const statusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "paid": return "default"
    case "pending": return "secondary"
    case "failed": return "destructive"
    case "refunded": return "outline"
    case "cancelled": return "outline"
    default: return "secondary"
  }
}

export default function OrdersPage() {
  const [items, setItems] = useState<SubscriptionOrderItem[]>([])
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState<OrderSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState("")
  const pageSize = 20

  const [refundOrder, setRefundOrder] = useState<SubscriptionOrderItem | null>(null)

  const fetchData = useCallback(() => {
    setLoading(true)
    orderApi
      .list({
        page,
        pageSize,
        status: status || undefined,
      })
      .then((data) => {
        setItems(data.items || [])
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, status])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    orderApi.summary().then(setSummary).catch(() => {})
  }, [])

  const handleRefund = async () => {
    if (!refundOrder) return
    try {
      await orderApi.refund(refundOrder.id, { reason: "Admin initiated refund" })
      toast.success(`Order "${refundOrder.id}" refunded`)
      setRefundOrder(null)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Refund failed")
    }
  }

  const formatTime = (ts: number | null) => {
    if (!ts) return "-"
    return new Date(ts * 1000).toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Orders" description="Manage subscription orders" />

      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard title="Total Revenue" value={summary.totalRevenue} icon={DollarSign} />
          <StatCard title="Total Orders" value={summary.totalOrders} icon={ShoppingCart} />
          <StatCard title="Pending" value={summary.pendingOrders} icon={Clock} />
          <StatCard title="Paid" value={summary.paidOrders} icon={CheckCircle} />
        </div>
      )}

      <div className="flex items-center gap-4">
        <Select value={status || "all"} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
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
              render: (o: SubscriptionOrderItem) => (
                <span className="text-sm font-medium">{o.userName}</span>
              ),
            },
            {
              key: "planName",
              header: "Plan",
              render: (o: SubscriptionOrderItem) => (
                <span className="text-sm">{o.planName}</span>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (o: SubscriptionOrderItem) => (
                <Badge variant={statusVariant(o.status)}>{o.status}</Badge>
              ),
            },
            {
              key: "paymentMethod",
              header: "Payment",
              render: (o: SubscriptionOrderItem) => (
                <span className="text-sm">{o.paymentMethod}</span>
              ),
            },
            {
              key: "amount",
              header: "Amount",
              render: (o: SubscriptionOrderItem) => (
                <span className="text-sm">{o.currency} {o.amount}</span>
              ),
            },
            {
              key: "createdAt",
              header: "Created",
              render: (o: SubscriptionOrderItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(o.createdAt)}</span>
              ),
            },
            {
              key: "paidAt",
              header: "Paid At",
              render: (o: SubscriptionOrderItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(o.paidAt)}</span>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (o: SubscriptionOrderItem) =>
                o.status === "paid" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={(e) => { e.stopPropagation(); setRefundOrder(o) }}
                  >
                    <RotateCcw className="mr-1 h-3 w-3" />Refund
                  </Button>
                ) : null,
            },
          ]}
        />
      )}

      <ConfirmDialog
        open={!!refundOrder}
        onOpenChange={(o) => { if (!o) setRefundOrder(null) }}
        title="Refund Order"
        description={`Are you sure you want to refund order "${refundOrder?.id}"? This action cannot be undone.`}
        confirmLabel="Refund"
        variant="destructive"
        onConfirm={handleRefund}
      />
    </div>
  )
}
