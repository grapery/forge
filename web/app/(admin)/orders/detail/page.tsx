"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"
import { useRouter, useSearchParams } from "next/navigation"
import { orderApi } from "@/lib/api/admin"
import type { SubscriptionOrderItem } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import Link from "next/link"
import { toast } from "sonner"
import { RotateCcw } from "lucide-react"

const statusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "completed":
    case "paid":
      return "default"
    case "pending":
      return "secondary"
    case "failed":
      return "destructive"
    default:
      return "outline"
  }
}

export default function OrderDetailPage() {
  const t = useTranslations("ordersDetail")
  const tOrders = useTranslations("orders")
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get("id") || ""

  const [order, setOrder] = useState<SubscriptionOrderItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [refundOpen, setRefundOpen] = useState(false)
  const [refundReason, setRefundReason] = useState("")
  const [refunding, setRefunding] = useState(false)

  useEffect(() => {
    if (!id) {
      router.push("/orders")
      return
    }
    orderApi
      .get(id)
      .then(setOrder)
      .catch(() => router.push("/orders"))
      .finally(() => setLoading(false))
  }, [id, router])

  const formatTime = (ts?: number | null) => {
    if (!ts) return "-"
    const ms = ts > 1e12 ? ts : ts * 1000
    return new Date(ms).toLocaleString()
  }

  const handleRefund = async () => {
    if (!order) return
    setRefunding(true)
    try {
      await orderApi.refund(order.id, {
        reason: refundReason.trim() || tOrders("toastRefundReason"),
      })
      toast.success(tOrders("toastRefunded", { id: order.id }))
      setRefundOpen(false)
      setRefundReason("")
      const updated = await orderApi.get(order.id)
      setOrder(updated)
    } catch (err: any) {
      toast.error(err?.message || tOrders("toastRefundFailed"))
    } finally {
      setRefunding(false)
    }
  }

  if (loading) return <PageSkeleton />
  if (!order) return null

  const canRefund = order.status === "completed" || order.status === "paid"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[28px] font-medium tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground font-mono text-sm">{order.id}</p>
        </div>
        <div className="flex gap-2">
          {canRefund && (
            <Button
              variant="destructive"
              onClick={() => {
                setRefundReason(tOrders("toastRefundReason"))
                setRefundOpen(true)
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {tOrders("buttonRefund")}
            </Button>
          )}
          <Button variant="outline" onClick={() => router.push("/orders")}>
            {t("buttonBackToList")}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("cardOrderInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">{t("fieldStatus")}</span>
              <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">{t("fieldAmount")}</span>
              <span className="font-medium">{order.currency} {order.amount}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">{t("fieldPlan")}</span>
              <span>{order.planName || order.planId || "-"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">{t("fieldPayment")}</span>
              <span>{order.paymentMethod || "-"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">{t("fieldPaymentId")}</span>
              <span className="font-mono text-xs break-all">{order.paymentId || "-"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">{t("fieldCreated")}</span>
              <span>{formatTime(order.createdAt)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">{t("fieldPeriod")}</span>
              <span>{formatTime(order.startDate)} → {formatTime(order.endDate)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("cardCustomer")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">{t("fieldUser")}</span>
              <Link href={`/users/detail?id=${order.userId}`} className="text-primary hover:underline">
                {order.userName || order.userId}
              </Link>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">{t("fieldUserId")}</span>
              <span className="font-mono text-xs break-all">{order.userId}</span>
            </div>
            <div className="pt-2 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => router.push(`/orders?userId=${order.userId}`)}>
                {t("buttonUserOrders")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => router.push(`/users/detail?id=${order.userId}`)}>
                {t("buttonUser360")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={refundOpen}
        onOpenChange={(o) => {
          if (!o) {
            setRefundOpen(false)
            setRefundReason("")
          }
        }}
        title={tOrders("dialogRefundTitle")}
        description={tOrders("dialogRefundDescription", { id: order.id })}
        confirmLabel={tOrders("buttonRefund")}
        variant="destructive"
        loading={refunding}
        onConfirm={handleRefund}
      >
        <div className="space-y-2 pt-2">
          <Label htmlFor="order-refund-reason">{tOrders("labelRefundReason")}</Label>
          <Input
            id="order-refund-reason"
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            placeholder={tOrders("placeholderRefundReason")}
          />
        </div>
      </ConfirmDialog>
    </div>
  )
}
