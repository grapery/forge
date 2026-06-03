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
import { adminUserApi } from "@/lib/api/admin"
import type { AdminUser } from "@/lib/types"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

interface ResetPasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  admin: AdminUser | null
}

export function ResetPasswordDialog({ open, onOpenChange, admin }: ResetPasswordDialogProps) {
  const t = useTranslations("resetPasswordDialog")
  const [loading, setLoading] = useState(false)
  const [newPassword, setNewPassword] = useState("")

  const handleSubmit = async () => {
    if (!admin || !newPassword) {
      toast.error(t("errorRequired"))
      return
    }
    setLoading(true)
    try {
      await adminUserApi.resetPassword(admin.id, newPassword)
      toast.success(`Password reset for ${admin.username}`)
      setNewPassword("")
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to reset password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            Set a new password for <strong>{admin?.username}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Resetting..." : "Reset Password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
