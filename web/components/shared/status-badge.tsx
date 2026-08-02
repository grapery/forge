"use client"

import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

const roleColors: Record<string, string> = {
  super_admin: "bg-[var(--status-danger-bg)] text-[var(--status-danger)] border border-[var(--status-danger)]/20",
  admin: "bg-[var(--status-warning-bg)] text-[var(--status-warning)] border border-[var(--status-warning)]/20",
  operator: "bg-[var(--status-info-bg)] text-[var(--status-info)] border border-[var(--status-info)]/20",
  viewer: "bg-secondary text-muted-foreground border border-border",
}

const statusColors: Record<string, string> = {
  active: "bg-[var(--status-success-bg)] text-[var(--status-success)] border border-[var(--status-success)]/20",
  disabled: "bg-[var(--status-danger-bg)] text-[var(--status-danger)] border border-[var(--status-danger)]/20",
}

const roleKeyMap: Record<string, string> = {
  super_admin: "roleSuperAdmin",
  admin: "roleAdmin",
  operator: "roleOperator",
  viewer: "roleViewer",
}

export function RoleBadge({ role }: { role: string }) {
  const t = useTranslations("common")
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        roleColors[role] || "bg-secondary text-muted-foreground border border-border",
      )}
    >
      {roleKeyMap[role] ? t(roleKeyMap[role]) : role}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("common")
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        statusColors[status] || "bg-secondary text-muted-foreground border border-border",
      )}
    >
      {status === "active" ? t("statusActive") : t("statusDisabled")}
    </span>
  )
}
