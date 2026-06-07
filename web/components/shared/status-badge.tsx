"use client"

import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

const roleColors: Record<string, string> = {
  super_admin: "bg-red-500/15 text-red-400 border border-red-500/20",
  admin: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
  operator: "bg-primary/15 text-primary border border-primary/20",
  viewer: "bg-secondary/60 text-muted-foreground border border-glass-border",
}

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
  disabled: "bg-red-500/15 text-red-400 border border-red-500/20",
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
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", roleColors[role] || "bg-secondary/60 text-muted-foreground border border-glass-border")}>      {roleKeyMap[role] ? t(roleKeyMap[role]) : role}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("common")
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", statusColors[status] || "bg-secondary/60 text-muted-foreground border border-glass-border")}>
      {status === "active" ? t("statusActive") : t("statusDisabled")}
    </span>
  )
}
