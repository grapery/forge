"use client"

import { useAuth } from "@/providers/auth-provider"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import {
  LogOut, KeyRound, Anvil, Globe, ChevronsUpDown, Search, Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useLocale } from "@/providers/locale-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { resolveActiveGroup, visibleTopSections } from "@/lib/nav"
import { SectionSubnav } from "@/components/layout/section-nav"
import { CommandPalette } from "@/components/layout/command-palette"

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations("nav")
  const tc = useTranslations("common")
  const { locale, setLocale } = useLocale()
  const [cmdOpen, setCmdOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setCmdOpen(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const openCmd = useCallback(() => setCmdOpen(true), [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="text-sm text-muted-foreground">{tc("loading")}</p>
        </div>
      </div>
    )
  }
  if (!user) return null

  const active = resolveActiveGroup(pathname)
  const sections = visibleTopSections(user)
  const showSubnav =
    active === "analytics" ||
    active === "support" ||
    active === "operations" ||
    active === "settings"

  const roleLabel =
    (user.role === "operator" || user.role === "viewer") && user.permissions
      ? `${t("role" + user.role.charAt(0).toUpperCase() + user.role.slice(1))} · ${user.permissions.length} ${t("permissionsLabel")}`
      : t(
          "role" +
            user.role.charAt(0).toUpperCase() +
            user.role.slice(1).replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()),
        )

  const isHub =
    pathname === "/analytics" ||
    pathname === "/support" ||
    pathname === "/operations" ||
    pathname === "/settings"

  const wide = pathname.startsWith("/ops-assistant")

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-topbar-bg">
        <div className="flex h-12 items-center gap-3 px-4 lg:px-6">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 shrink-0 mr-1"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary">
              <Anvil className="h-3.5 w-3.5 text-foreground" />
            </div>
            <span className="font-medium text-sm tracking-tight hidden sm:inline">{t("brandName")}</span>
          </button>

          <nav className="flex items-center gap-0.5 overflow-x-auto flex-1 min-w-0">
            {sections.map((section) => {
              const isActive =
                section.id === "dashboard"
                  ? active === "dashboard"
                  : active === section.id
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => router.push(section.href)}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-sm whitespace-nowrap transition-colors",
                    isActive
                      ? "bg-background text-foreground font-medium shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/60",
                  )}
                >
                  {t(section.label)}
                </button>
              )
            })}
          </nav>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => router.push("/ops-assistant")}>
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden md:inline">{t("ask")}</span>
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={openCmd}>
              <Search className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">{t("search")}</span>
              <kbd className="hidden xl:inline text-[10px] border border-border rounded px-1 ml-1">⌘K</kbd>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2 h-8">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-foreground text-xs font-medium">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-sm font-medium leading-none">{user.displayName || user.username}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{roleLabel}</p>
                  </div>
                  <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setLocale(locale === "en" ? "zh" : "en")}>
                  <Globe className="mr-2 h-4 w-4 text-muted-foreground" />
                  {locale === "en" ? "中文" : "English"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/change-password")}>
                  <KeyRound className="mr-2 h-4 w-4 text-muted-foreground" />
                  {t("changePassword")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <div key={pathname} className={cn("mx-auto w-full px-6 py-8 lg:px-10", wide ? "max-w-5xl" : "max-w-7xl")}>
          {showSubnav && !isHub && <SectionSubnav group={active as "analytics" | "support" | "operations" | "settings"} />}
          {children}
        </div>
      </main>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  )
}
