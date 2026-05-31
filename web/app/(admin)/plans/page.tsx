"use client"

import { useEffect, useState, useCallback } from "react"
import { planApi } from "@/lib/api/admin"
import type { SubscriptionPlanItem } from "@/lib/types"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { StatCard } from "@/components/shared/stat-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CreditCard, Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"

interface PlanFormData {
  name: string
  membershipTier: string
  billingPeriod: string
  price: string
  currency: string
  tokenQuota: string
  maxStories: string
  maxCharacters: string
  isActive: boolean
  sortOrder: string
}

const emptyForm: PlanFormData = {
  name: "",
  membershipTier: "basic",
  billingPeriod: "monthly",
  price: "",
  currency: "USD",
  tokenQuota: "",
  maxStories: "",
  maxCharacters: "",
  isActive: true,
  sortOrder: "0",
}

export default function PlansPage() {
  const [items, setItems] = useState<SubscriptionPlanItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const pageSize = 20

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editPlan, setEditPlan] = useState<SubscriptionPlanItem | null>(null)
  const [deletePlan, setDeletePlan] = useState<SubscriptionPlanItem | null>(null)
  const [form, setForm] = useState<PlanFormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const fetchData = useCallback(() => {
    setLoading(true)
    planApi
      .list({ page, pageSize })
      .then((data) => {
        setItems(data.items || [])
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openCreate = () => {
    setForm(emptyForm)
    setShowCreateDialog(true)
  }

  const openEdit = (plan: SubscriptionPlanItem) => {
    setForm({
      name: plan.name,
      membershipTier: plan.membershipTier,
      billingPeriod: plan.billingPeriod,
      price: String(plan.price),
      currency: plan.currency,
      tokenQuota: String(plan.tokenQuota),
      maxStories: String(plan.maxStories),
      maxCharacters: String(plan.maxCharacters),
      isActive: plan.isActive,
      sortOrder: String(plan.sortOrder),
    })
    setEditPlan(plan)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const data = {
        name: form.name,
        membershipTier: form.membershipTier,
        billingPeriod: form.billingPeriod,
        price: Number(form.price),
        currency: form.currency,
        tokenQuota: Number(form.tokenQuota),
        maxStories: Number(form.maxStories),
        maxCharacters: Number(form.maxCharacters),
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder),
      }
      if (editPlan) {
        await planApi.update(editPlan.id, data)
        toast.success(`Plan "${form.name}" updated`)
        setEditPlan(null)
      } else {
        await planApi.create(data)
        toast.success(`Plan "${form.name}" created`)
        setShowCreateDialog(false)
      }
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Action failed")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletePlan) return
    try {
      await planApi.update(deletePlan.id, { isActive: false })
      toast.success(`Plan "${deletePlan.name}" deactivated`)
      setDeletePlan(null)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Delete failed")
    }
  }

  const formatTime = (ts: number | null) => {
    if (!ts) return "-"
    return new Date(ts * 1000).toLocaleDateString()
  }

  const dialogOpen = showCreateDialog || !!editPlan

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plans"
        description="Manage subscription plans"
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Create Plan
          </Button>
        }
      />

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading...</div>
      ) : (
        <DataTable
          data={items}
          pagination={{ page, pageSize, total }}
          onPageChange={setPage}
          columns={[
            {
              key: "name",
              header: "Name",
              render: (p: SubscriptionPlanItem) => (
                <span className="text-sm font-medium">{p.name}</span>
              ),
            },
            {
              key: "membershipTier",
              header: "Tier",
              render: (p: SubscriptionPlanItem) => (
                <Badge variant={p.membershipTier === "premium" ? "default" : p.membershipTier === "basic" ? "secondary" : "outline"}>
                  {p.membershipTier}
                </Badge>
              ),
            },
            {
              key: "billingPeriod",
              header: "Billing",
              render: (p: SubscriptionPlanItem) => (
                <span className="text-sm capitalize">{p.billingPeriod}</span>
              ),
            },
            {
              key: "price",
              header: "Price",
              render: (p: SubscriptionPlanItem) => (
                <span className="text-sm">{p.currency} {p.price}</span>
              ),
            },
            {
              key: "tokenQuota",
              header: "Token Quota",
              render: (p: SubscriptionPlanItem) => (
                <span className="text-sm">{p.tokenQuota}</span>
              ),
            },
            {
              key: "maxStories",
              header: "Max Stories",
              render: (p: SubscriptionPlanItem) => (
                <span className="text-sm">{p.maxStories}</span>
              ),
            },
            {
              key: "maxCharacters",
              header: "Max Characters",
              render: (p: SubscriptionPlanItem) => (
                <span className="text-sm">{p.maxCharacters}</span>
              ),
            },
            {
              key: "isActive",
              header: "Active",
              render: (p: SubscriptionPlanItem) => (
                <Badge variant={p.isActive ? "default" : "secondary"}>
                  {p.isActive ? "Active" : "Inactive"}
                </Badge>
              ),
            },
            {
              key: "sortOrder",
              header: "Sort",
              render: (p: SubscriptionPlanItem) => (
                <span className="text-sm">{p.sortOrder}</span>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (p: SubscriptionPlanItem) => (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); openEdit(p) }}
                  >
                    <Pencil className="mr-1 h-3 w-3" />Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={(e) => { e.stopPropagation(); setDeletePlan(p) }}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />Delete
                  </Button>
                </div>
              ),
            },
          ]}
        />
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) { setShowCreateDialog(false); setEditPlan(null) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editPlan ? "Edit Plan" : "Create Plan"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tier</Label>
                <Select value={form.membershipTier} onValueChange={(v) => setForm({ ...form, membershipTier: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Billing Period</Label>
                <Select value={form.billingPeriod} onValueChange={(v) => setForm({ ...form, billingPeriod: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Price</Label>
                <Input id="price" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Input id="currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="tokenQuota">Token Quota</Label>
                <Input id="tokenQuota" type="number" value={form.tokenQuota} onChange={(e) => setForm({ ...form, tokenQuota: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="maxStories">Max Stories</Label>
                <Input id="maxStories" type="number" value={form.maxStories} onChange={(e) => setForm({ ...form, maxStories: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="maxCharacters">Max Characters</Label>
                <Input id="maxCharacters" type="number" value={form.maxCharacters} onChange={(e) => setForm({ ...form, maxCharacters: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Active</Label>
                <Select value={form.isActive ? "true" : "false"} onValueChange={(v) => setForm({ ...form, isActive: v === "true" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input id="sortOrder" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); setEditPlan(null) }} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Saving..." : editPlan ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deletePlan}
        onOpenChange={(o) => { if (!o) setDeletePlan(null) }}
        title="Delete Plan"
        description={`Are you sure you want to deactivate "${deletePlan?.name}"?`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
