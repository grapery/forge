"use client"

import { useState } from "react"
import { authApi } from "@/lib/api/admin"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

export default function ChangePasswordPage() {
  const t = useTranslations("changePassword")
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.oldPassword || !form.newPassword || !form.confirmPassword) {
      toast.error("Please fill in all fields")
      return
    }
    if (form.newPassword !== form.confirmPassword) {
      toast.error("New passwords do not match")
      return
    }
    if (form.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }

    setLoading(true)
    try {
      await authApi.changePassword(form.oldPassword, form.newPassword)
      toast.success("Password changed successfully")
      router.push("/dashboard")
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to change password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      <Card className="max-w-md">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="old-password">{t("fieldCurrentPassword")}</Label>
              <Input
                id="old-password"
                type="password"
                value={form.oldPassword}
                onChange={(e) => setForm({ ...form, oldPassword: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-password">{t("fieldNewPassword")}</Label>
              <Input
                id="new-password"
                type="password"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">{t("fieldConfirmPassword")}</Label>
              <Input
                id="confirm-password"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Changing..." : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
