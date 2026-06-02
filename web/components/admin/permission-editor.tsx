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

interface PermissionEditorProps {
  userId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

const permissionGroups: { label: string; permissions: { key: string; label: string }[] }[] = [
  {
    label: "Content",
    permissions: [
      { key: "content", label: "Content Management" },
      { key: "characters", label: "Character Management" },
      { key: "comments", label: "Comment Management" },
      { key: "tags", label: "Tag Management" },
      { key: "genres", label: "Genre Management" },
    ],
  },
  {
    label: "AI",
    permissions: [
      { key: "ai-tasks", label: "AI Task Management" },
      { key: "ai-generations", label: "AI Generation Management" },
      { key: "agents", label: "Agent Management" },
      { key: "prompts", label: "Prompt Management" },
      { key: "styles", label: "Style Management" },
    ],
  },
  {
    label: "Users",
    permissions: [
      { key: "users", label: "User Management" },
      { key: "audit-log", label: "Audit Log" },
    ],
  },
  {
    label: "Finance",
    permissions: [
      { key: "memberships", label: "Membership Management" },
      { key: "orders", label: "Order Management" },
      { key: "tokens", label: "Token Management" },
    ],
  },
  {
    label: "Growth",
    permissions: [
      { key: "invitation-codes", label: "Invitation Code Management" },
      { key: "search", label: "Search Analytics" },
    ],
  },
  {
    label: "Community",
    permissions: [
      { key: "feedback", label: "Feedback Management" },
      { key: "reports", label: "Report Management" },
      { key: "topics", label: "Topic Management" },
      { key: "notifications", label: "Notification Management" },
    ],
  },
]

const allPermissionKeys = permissionGroups.flatMap((g) => g.permissions.map((p) => p.key))

export function PermissionEditor({ userId, open, onOpenChange, onSaved }: PermissionEditorProps) {
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
        toast.error("Failed to load permissions")
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
      toast.success("Permissions updated successfully")
      onOpenChange(false)
      onSaved()
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to update permissions")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Permissions</DialogTitle>
          <DialogDescription>
            Configure which sections this admin user can access.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading permissions...</div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>
                Deselect All
              </Button>
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
                      {group.label}
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
                        {perm.label}
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
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || saving}>
            {saving ? "Saving..." : "Save Permissions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
