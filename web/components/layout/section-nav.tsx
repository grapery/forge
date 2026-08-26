"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import {
  itemsForGroup,
  isNavItemActive,
  groupOpsItems,
  type HubBadge,
  type NavGroup,
} from "@/lib/nav"
import { useAuth } from "@/providers/auth-provider"

export function SectionSubnav({ group }: { group: NavGroup }) {
  const { user } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations("nav")

  if (!user || !group) return null

  const items = itemsForGroup(group, user)
  if (items.length === 0) return null

  const clusters = group === "operations" ? groupOpsItems(items) : [{ key: "other" as const, items }]

  return (
    <div className="sticky top-12 z-30 -mx-4 mb-5 overflow-x-auto border-b border-border bg-background/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
      <div className="flex min-w-max items-center gap-2">
        {clusters.map((cluster, idx) => (
          <div key={cluster.key} className="flex items-center gap-1">
            {idx > 0 && <span className="mx-1 h-4 w-px bg-border" aria-hidden />}
            {cluster.key !== "other" && group === "operations" && (
              <span className="mr-1 text-[10px] uppercase tracking-wide text-muted-foreground/80">
                {t(`opsGroup_${cluster.key}`)}
              </span>
            )}
            {cluster.items.map((item) => {
              const active = isNavItemActive(pathname, item.href)
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => router.push(item.href)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "bg-secondary text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                  )}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {t(item.label)}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export function HubGrid({
  group,
  badges,
}: {
  group: NavGroup
  badges?: Record<string, HubBadge>
}) {
  const { user } = useAuth()
  const t = useTranslations("nav")
  const th = useTranslations("hub")

  if (!user) return null
  const items = itemsForGroup(group, user)
  const clusters = group === "operations" ? groupOpsItems(items) : [{ key: "other" as const, items }]

  return (
    <div className="space-y-6">
      {clusters.map((cluster) => (
        <div key={cluster.key} className="space-y-2">
          {cluster.key !== "other" && group === "operations" && (
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t(`opsGroup_${cluster.key}`)}
            </h2>
          )}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {cluster.items.map((item) => {
              const badge = badges?.[item.href]
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex min-h-[104px] items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/30 hover:bg-secondary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary transition-colors group-hover:bg-background">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{t(item.label)}</p>
                      {badge && Number(badge.value) > 0 && (
                        <span
                          className={cn(
                            "shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
                            badge.tone === "danger" && "bg-[var(--status-danger-bg)] text-[var(--status-danger)]",
                            badge.tone === "warning" && "bg-[var(--status-warning-bg)] text-[var(--status-warning)]",
                            (!badge.tone || badge.tone === "neutral") && "bg-secondary text-muted-foreground",
                          )}
                        >
                          {badge.value}
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{th(item.description)}</p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
