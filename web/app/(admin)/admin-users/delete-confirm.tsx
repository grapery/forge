"use client"

import { adminUserApi } from "@/lib/api/admin"
import type { AdminUser } from "@/lib/types"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { toast } from "sonner"

interface DeleteAdminConfirmProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  admin: AdminUser | null
  onSuccess: () => void
}

export function DeleteAdminConfirm({ open, onOpenChange, admin, onSuccess }: DeleteAdminConfirmProps) {
  const handleDelete = async () => {
    if (!admin) return
    try {
      await adminUserApi.delete(admin.id)
      toast.success(`Admin user ${admin.username} deleted`)
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to delete admin user")
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Admin User"
      description={`Are you sure you want to delete "${admin?.username}"? This action cannot be undone.`}
      confirmLabel="Delete"
      variant="destructive"
      onConfirm={handleDelete}
    />
  )
}
