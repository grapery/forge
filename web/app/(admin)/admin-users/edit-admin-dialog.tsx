"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { adminUserApi } from "@/lib/api/admin"
import type { AdminUser } from "@/lib/types"
import { toast } from "sonner"

interface EditAdminDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  admin: AdminUser | null
  onSuccess: () => void
}

export function EditAdminDialog({ open, onOpenChange, admin, onSuccess }: EditAdminDialogProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    displayName: admin?.displayName || "",
    role: (admin?.role || "viewer") as AdminUser["role"],
    status: (admin?.status || "active") as AdminUser["status"],
  })

  const handleOpen = (val: boolean) => {
    if (val && admin) {
      setForm({
        displayName: admin.displayName || "",
        role: admin.role as AdminUser["role"],
        status: admin.status as AdminUser["status"],
      })
    }
    onOpenChange(val)
  }

  const handleSubmit = async () => {
    if (!admin) return
    setLoading(true)
    try {
      await adminUserApi.update(admin.id, form)
      toast.success("Admin user updated successfully")
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to update admin user")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Admin User</DialogTitle>
          <DialogDescription>Update {admin?.username}&apos;s information.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Username</Label>
            <Input value={admin?.username || ""} disabled />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-displayName">Display Name</Label>
            <Input
              id="edit-displayName"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              placeholder="Enter display name"
            />
          </div>
          <div className="grid gap-2">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as AdminUser["role"] })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="operator">Operator</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as AdminUser["status"] })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
