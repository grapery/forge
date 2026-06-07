"use client"

import { useAuth } from "@/providers/auth-provider"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import { useTranslations } from "next-intl"
import {
  LayoutDashboard, Users, FileText, Shield, LogOut,
  MessageSquare, Hash, Sparkles, KeyRound, Ghost, Brain,
  CreditCard, Coins, Tags, Palette, BookOpen, Mail, Search,
  UserX, Smartphone, Bot, Terminal, Receipt, Flag, Bell,
  Crown, UserCheck, ScrollText, Anvil, Globe, ChevronsUpDown,
  BarChart3,
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

type NavItem = {
  href: string
  label: string
  icon: any
  roles: string[]
  group?: string
  permission?: string
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "dashboard", icon: LayoutDashboard, roles: ["super_admin", "admin", "operator", "viewer"] },
  // Analytics
  { href: "/analytics/users", label: "analyticsUsers", icon: BarChart3, roles: ["super_admin", "admin"], group: "analytics", permission: "users" },
  { href: "/analytics/content", label: "analyticsContent", icon: BookOpen, roles: ["super_admin", "admin"], group: "analytics", permission: "content" },
  { href: "/analytics/revenue", label: "analyticsRevenue", icon: CreditCard, roles: ["super_admin", "admin"], group: "analytics", permission: "orders" },
  { href: "/analytics/ai", label: "analyticsAi", icon: Brain, roles: ["super_admin", "admin"], group: "analytics", permission: "ai-tasks" },
  // Operations
  { href: "/content", label: "content", icon: FileText, roles: ["super_admin", "admin"], group: "operations", permission: "content" },
  { href: "/characters", label: "characters", icon: Ghost, roles: ["super_admin", "admin"], group: "operations", permission: "characters" },
  { href: "/comments", label: "comments", icon: MessageSquare, roles: ["super_admin", "admin", "operator"], group: "operations", permission: "comments" },
  { href: "/tags", label: "tags", icon: Tags, roles: ["super_admin", "admin"], group: "operations", permission: "tags" },
  { href: "/genres", label: "genres", icon: BookOpen, roles: ["super_admin", "admin"], group: "operations", permission: "genres" },
  { href: "/ai-tasks", label: "aiTasks", icon: Brain, roles: ["super_admin", "admin"], group: "operations", permission: "ai-tasks" },
  { href: "/ai-generations", label: "aiGenerations", icon: Sparkles, roles: ["super_admin", "admin"], group: "operations", permission: "ai-generations" },
  { href: "/agents", label: "agents", icon: Bot, roles: ["super_admin", "admin"], group: "operations", permission: "agents" },
  { href: "/prompts", label: "prompts", icon: Terminal, roles: ["super_admin", "admin"], group: "operations", permission: "prompts" },
  { href: "/users", label: "users", icon: Users, roles: ["super_admin", "admin"], group: "operations", permission: "users" },
  { href: "/account-deletions", label: "accountDeletions", icon: UserX, roles: ["super_admin", "admin"], group: "operations", permission: "users" },
  { href: "/devices", label: "devices", icon: Smartphone, roles: ["super_admin", "admin"], group: "operations", permission: "users" },
  { href: "/memberships", label: "memberships", icon: Crown, roles: ["super_admin", "admin"], group: "operations", permission: "memberships" },
  { href: "/orders", label: "orders", icon: Receipt, roles: ["super_admin", "admin"], group: "operations", permission: "orders" },
  { href: "/tokens", label: "tokens", icon: Coins, roles: ["super_admin", "admin"], group: "operations", permission: "tokens" },
  { href: "/invitation-codes", label: "invitationCodes", icon: Mail, roles: ["super_admin", "admin"], group: "operations", permission: "invitation-codes" },
  { href: "/referrals", label: "referrals", icon: UserCheck, roles: ["super_admin", "admin"], group: "operations", permission: "invitation-codes" },
  { href: "/search-analytics", label: "searchAnalytics", icon: Search, roles: ["super_admin", "admin"], group: "operations", permission: "search" },
  { href: "/feedback", label: "feedback", icon: MessageSquare, roles: ["super_admin", "admin", "operator"], group: "operations", permission: "feedback" },
  { href: "/reports", label: "reports", icon: Flag, roles: ["super_admin", "admin", "operator"], group: "operations", permission: "reports" },
  { href: "/topics", label: "topics", icon: Hash, roles: ["super_admin", "admin", "operator"], group: "operations", permission: "topics" },
  { href: "/notifications", label: "broadcast", icon: Bell, roles: ["super_admin", "admin"], group: "operations", permission: "notifications" },
  // Settings
  { href: "/admin-users", label: "adminUsers", icon: Shield, roles: ["super_admin"], group: "settings" },
  { href: "/audit-log", label: "auditLog", icon: ScrollText, roles: ["super_admin", "admin"], group: "settings", permission: "audit-log" },
  { href: "/styles", label: "styles", icon: Palette, roles: ["super_admin", "admin"], group: "settings", permission: "styles" },
  { href: "/change-password", label: "changePassword", icon: KeyRound, roles: ["super_admin", "admin", "operator", "viewer"], group: "settings" },
]

const groupOrder = ["", "analytics", "operations", "settings"]
const groupLabels: Record<string, string> = {
  "": "",
  "analytics": "groupAnalytics",
  "operations": "groupOperations",
  "settings": "groupSettings",
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations("nav")
  const tc = useTranslations("common")
  const { locale, setLocale } = useLocale()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center animate-fade-in">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
          <p className="text-sm text-muted-foreground">{tc("loading")}</p>
        </div>
      </div>
    )
  }
  if (!user) return null

  const filteredNav = navItems.filter((item) => {
    if (!item.roles.includes(user.role)) return false
    if ((user.role === "operator" || user.role === "viewer") && item.permission) {
      const userPermissions = user.permissions || []
      if (!userPermissions.includes(item.permission)) return false
    }
    return true
  })

  const groupedNav: { label: string; items: NavItem[] }[] = []
  for (const group of groupOrder) {
    const items = filteredNav.filter((item) => (item.group || "") === group)
    if (items.length > 0) {
      groupedNav.push({ label: group, items })
    }
  }

  const roleLabel = (user.role === "operator" || user.role === "viewer") && user.permissions
    ? `${t("role" + user.role.charAt(0).toUpperCase() + user.role.slice(1))} · ${user.permissions.length} ${t("permissionsLabel")}`
    : t("role" + user.role.charAt(0).toUpperCase() + user.role.slice(1).replace(/_([a-z])/g, (_, c) => c.toUpperCase()))

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 border-r border-glass-border bg-sidebar-bg backdrop-blur-xl flex flex-col shadow-sm">
        <div className="flex h-14 items-center gap-2.5 border-b border-glass-border px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
            <Anvil className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold tracking-tight">{t("brandName")}</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {groupedNav.map((group) => (
            <div key={group.label} className="mb-2">
              {group.label && (
                <div className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">
                  {t(groupLabels[group.label])}
                </div>
              )}
              {group.items.map((item) => (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-150 border-l-[3px]",
                    pathname.startsWith(item.href)
                      ? "bg-primary/10 text-primary font-medium border-l-primary sidebar-active-bg"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground hover:translate-x-0.5 border-l-transparent"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {t(item.label)}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-glass-border px-6 bg-sidebar-bg backdrop-blur-xl">
          <div />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2 h-9">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground text-xs font-medium">
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
                <Globe className="mr-2 h-4 w-4" />
                {locale === "en" ? "中文" : "English"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/change-password")}>
                <KeyRound className="mr-2 h-4 w-4" />
                {t("changePassword")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                {t("logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 overflow-auto">
          <div key={pathname} className="p-6 animate-fade-in-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
