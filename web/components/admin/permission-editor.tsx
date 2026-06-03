"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { adminUserApi } from "@/lib/api/admin"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

interface PermissionEditorProps {
  userId: string
  username: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

const permissionGroups: { label: string; permissions: { key: string; label: string }[] }[] = [
  {
    label: "content",
    permissions: [
      { key: "content", label: "contentMgmt" },
      { key: "characters", label: "characterMgmt" },
      { key: "comments", label: "commentMgmt" },
      { key: "tags", label: "tagMgmt" },
      { key: "genres", label: "genreMgmt" },
    ],
  },
  {
    label: "ai",
    permissions: [
      { key: "ai-tasks", label: "aiTaskMgmt" },
      { key: "ai-generations", label: "aiGenMgmt" },
      { key: "agents", label: "agentMgmt" },
      { key: "prompts", label: "promptMgmt" },
      { key: "styles", label: "styleMgmt" },
    ],
  },
  {
    label: "users",
    permissions: [
      { key: "users", label: "userMgmt" },
      { key: "audit-log", label: "auditLog" },
    ],
  },
  {
    label: "finance",
    permissions: [
      { key: "memberships", label: "membershipMgmt" },
      { key: "orders", label: "orderMgmt" },
      { key: "tokens", label: "tokenMgmt" },
    ],
  },
  {
    label: "growth",
    permissions: [
      { key: "invitation-codes", label: "inviteCodeMgmt" },
      { key: "search", label: "searchAnalytics" },
    ],
  },
  {
    label: "community",
    permissions: [
      { key: "feedback", label: "feedbackMgmt" },
      { key: "reports", label: "reportMgmt" },
      { key: "topics", label: "topicMgmt" },
      { key: "notifications", label: "notificationMgmt" },
    ],
  },
]

const allPermissionKeys = permissionGroups.flatMap((g) => g.permissions.map((p) => p.key))

export function PermissionEditor({ userId, username, open, onOpenChange, onSaved }: PermissionEditorProps) {
  const t = useTranslations("permissions")
  const tc = useTranslations("common")
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setSelected([])
    adminUserApi
      .getPermissions(userId)
      .then((permissions) => {
        setSelected(permissions || [])
      })
      .catch(() => {
        toast.error(t("toastLoadFailed"))
      })
      .finally(() => setLoading(false))
  }, [open, userId])

  const togglePermission = (key: string) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    )
  }

  const toggleGroup = (groupKeys: string[]) => {
    const allSelected = groupKeys.every((key) => selected.includes(key))
    if (allSelected) {
      setSelected((prev) => prev.filter((p) => !groupKeys.includes(p)))
    } else {
      setSelected((prev) => [...new Set([...prev, ...groupKeys])])
    }
  }

  const selectAll = () => setSelected(allPermissionKeys)
  const deselectAll = () => setSelected([])

  const handleSave = async () => {
    setSaving(true)
    try {
      await adminUserApi.updatePermissions(userId, selected)
      toast.success(t("toastUpdated"))
      onOpenChange(false)
      onSaved()
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || t("toastUpdateFailed"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")} — {username}</DialogTitle>
          <DialogDescription>
            {t("dialogDescription")}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">{t("loadingPermissions")}</div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("selectedCount", { count: selected.length, total: allPermissionKeys.length })}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  {t("buttonSelectAll")}
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  {t("buttonDeselectAll")}
                </Button>
              </div>
            </div>

            {permissionGroups.map((group) => {
              const groupKeys = group.permissions.map((p) => p.key)
              const allGroupSelected = groupKeys.every((key) => selected.includes(key))

              return (
                <div key={group.label} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`group-${group.label}`}
                      checked={allGroupSelected}
                      onChange={() => toggleGroup(groupKeys)}
                    />
                    <label
                      htmlFor={`group-${group.label}`}
                      className="text-sm font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer"
                    >
                      {t(group.label)}
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pl-6">
                    {group.permissions.map((perm) => (
                      <label
                        key={perm.key}
                        htmlFor={`perm-${perm.key}`}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <Checkbox
                          id={`perm-${perm.key}`}
                          checked={selected.includes(perm.key)}
                          onChange={() => togglePermission(perm.key)}
                        />
                        {t(perm.label)}
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={loading || saving}>
            {saving ? tc("processing") : tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
