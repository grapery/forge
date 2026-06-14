"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { membershipApi } from "@/lib/api/admin"
import type { MembershipItem, MembershipTier } from "@/lib/types"
import { toast } from "sonner"

type Mode = "upsert" | "renew" | "cancel"

interface Props {
  mode: Mode
  open: boolean
  onOpenChange: (o: boolean) => void
  userId: string
  initial?: MembershipItem | null
  membershipId?: string
  onSubmitted: () => void
}

function toDateString(unixSeconds: number | null | undefined): string {
  if (!unixSeconds) return ""
  const d = new Date(unixSeconds * 1000)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function dateToEndUnix(dateStr: string): number {
  return Math.floor(new Date(dateStr + "T23:59:59").getTime() / 1000)
}

function defaultEndDateStr(daysFromNow: number): string {
  const d = new Date(Date.now() + daysFromNow * 86400 * 1000)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function MembershipFormDialog({
  mode, open, onOpenChange, userId, initial, membershipId, onSubmitted,
}: Props) {
  const t = useTranslations("memberships")

  const [tier, setTier] = useState<MembershipTier>("basic")
  const [tokenQuota, setTokenQuota] = useState(1000)
  const [endDate, setEndDate] = useState("")
  const [autoRenew, setAutoRenew] = useState(false)
  const [extendDays, setExtendDays] = useState(30)
  const [topUpTokens, setTopUpTokens] = useState(0)
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    if (mode === "upsert" && initial) {
      setTier((initial.tier as MembershipTier) || "basic")
      setTokenQuota(initial.tokenQuota ?? 1000)
      setEndDate(toDateString(initial.endDate))
      setAutoRenew(!!initial.autoRenew)
    } else if (mode === "upsert") {
      setTier("basic")
      setTokenQuota(1000)
      setEndDate(defaultEndDateStr(30))
      setAutoRenew(false)
    } else if (mode === "renew") {
      setExtendDays(30)
      setTopUpTokens(0)
    }
    setReason("")
  }, [open, mode, initial])

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error(t("reasonRequired"))
      return
    }
    setSubmitting(true)
    try {
      if (mode === "upsert") {
        if (!endDate) {
          toast.error(t("errorEndDateRequired"))
          setSubmitting(false)
          return
        }
        const endUnix = dateToEndUnix(endDate)
        if (endUnix <= Math.floor(Date.now() / 1000)) {
          toast.error(t("errorEndDatePast"))
          setSubmitting(false)
          return
        }
        await membershipApi.upsert({
          userId,
          tier,
          tokenQuota,
          endDate: endUnix,
          autoRenew,
          reason: reason.trim(),
        })
        toast.success(initial ? t("toastUpserted") : t("toastCreated"))
      } else if (mode === "renew") {
        if (!membershipId) {
          toast.error(t("errorMembershipNotFound"))
          setSubmitting(false)
          return
        }
        await membershipApi.renew(membershipId, {
          extendDays,
          topUpTokens,
          reason: reason.trim(),
        })
        toast.success(t("toastRenewed"))
      } else {
        if (!membershipId) {
          toast.error(t("errorMembershipNotFound"))
          setSubmitting(false)
          return
        }
        await membershipApi.cancel(membershipId, { reason: reason.trim() })
        toast.success(t("toastCancelled"))
      }
      onSubmitted()
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || t("toastFailed"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "upsert"
              ? (initial ? t("dialogUpsertTitleEdit") : t("dialogUpsertTitle"))
              : mode === "renew"
                ? t("dialogRenewTitle")
                : t("dialogCancelTitle")}
          </DialogTitle>
          <DialogDescription>
            {mode === "upsert"
              ? (initial ? t("dialogUpsertDescEdit") : t("dialogUpsertDesc"))
              : mode === "renew"
                ? t("dialogRenewDesc")
                : t("dialogCancelDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {mode === "upsert" ? (
            <>
              <div className="space-y-1.5">
                <Label>{t("fieldTier")}</Label>
                <Select value={tier} onValueChange={(v) => setTier(v as MembershipTier)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">{t("tierBasic")}</SelectItem>
                    <SelectItem value="pro">{t("tierPro")}</SelectItem>
                    <SelectItem value="premium">{t("tierPremium")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>{t("fieldTokenQuota")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={tokenQuota}
                  onChange={(e) => setTokenQuota(Math.max(0, Number(e.target.value)))}
                />
                {initial && (
                  <p className="text-xs text-muted-foreground">
                    {t("hintTokenDelta", { old: initial.tokenQuota, used: initial.tokenUsed })}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>{t("fieldEndDate")}</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="auto-renew"
                  checked={autoRenew}
                  onChange={(e) => setAutoRenew((e.target as HTMLInputElement).checked)}
                />
                <Label htmlFor="auto-renew" className="cursor-pointer">{t("fieldAutoRenew")}</Label>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>{t("fieldExtendDays")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={extendDays}
                  onChange={(e) => setExtendDays(Math.max(1, Number(e.target.value)))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("fieldTopUpTokens")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={topUpTokens}
                  onChange={(e) => setTopUpTokens(Math.max(0, Number(e.target.value)))}
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label>{t("fieldReason")} <span className="text-destructive">*</span></Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("reasonPlaceholder")}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t("buttonCancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            variant={mode === "cancel" ? "destructive" : "default"}
          >
            {submitting
              ? t("processing")
              : mode === "upsert"
                ? t("buttonSubmit")
                : mode === "renew"
                  ? t("buttonRenew")
                  : t("buttonCancelMembership")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
