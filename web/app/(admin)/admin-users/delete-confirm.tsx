"use client"

import { adminUserApi } from "@/lib/api/admin"
import type { AdminUser } from "@/lib/types"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

interface DeleteAdminConfirmProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  admin: AdminUser | null
  onSuccess: () => void
}

export function DeleteAdminConfirm({ open, onOpenChange, admin, onSuccess }: DeleteAdminConfirmProps) {
  const t = useTranslations("deleteAdminConfirm")
  const handleDelete = async () => {
    if (!admin) return
    try {
      await adminUserApi.delete(admin.id)
      toast.success(`Admin user ${admin.username} deleted`)
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || t("toastDeleteFailed"))
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("dialogTitle")}
      description={`Are you sure you want to delete "${admin?.username}"? This action cannot be undone.`}
      confirmLabel={t("buttonDelete")}
      variant="destructive"
      onConfirm={handleDelete}
    />
  )
}
