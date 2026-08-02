"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Search } from "lucide-react"
import { filterNavItems, navItems, topSections } from "@/lib/nav"
import { useAuth } from "@/providers/auth-provider"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth()
  const router = useRouter()
  const t = useTranslations("nav")
  const [query, setQuery] = useState("")

  useEffect(() => {
    if (!open) setQuery("")
  }, [open])

  const items = useMemo(() => {
    if (!user) return []
    const filtered = filterNavItems(navItems, user)
    const hubs = topSections
      .filter((s) => s.id !== "dashboard")
      .map((s) => ({
        href: s.href,
        label: t(s.label),
        group: s.id,
        icon: null as null,
      }))
    const pages = filtered.map((item) => ({
      href: item.href,
      label: t(item.label),
      group: item.group || "dashboard",
      icon: item.icon,
    }))
    const all = [
      { href: "/dashboard", label: t("dashboard"), group: "dashboard", icon: null },
      { href: "/ops-assistant", label: t("opsAssistant"), group: "ops", icon: null },
      ...hubs,
      ...pages,
    ]
    const q = query.trim().toLowerCase()
    if (!q) return all
    return all.filter((i) => i.label.toLowerCase().includes(q) || i.href.includes(q))
  }, [user, query, t])

  const go = useCallback(
    (href: string) => {
      onOpenChange(false)
      router.push(href)
    },
    [onOpenChange, router],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">{t("commandPalette")}</DialogTitle>
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("commandPlaceholder")}
            className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">esc</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">{t("commandEmpty")}</p>
          ) : (
            items.map((item) => (
              <button
                key={`${item.group}-${item.href}`}
                type="button"
                onClick={() => go(item.href)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-secondary transition-colors",
                )}
              >
                {item.icon ? <item.icon className="h-4 w-4 text-muted-foreground" /> : <Search className="h-4 w-4 text-muted-foreground" />}
                <span className="flex-1 truncate">{item.label}</span>
                <span className="text-[10px] text-muted-foreground truncate max-w-[40%]">{item.href}</span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
