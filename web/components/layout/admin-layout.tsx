"use client"

import { useAuth } from "@/providers/auth-provider"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import {
  LayoutDashboard,
  Users,
  FileText,
  Shield,
  Activity,
  LogOut,
  MessageSquare,
  Hash,
  Sparkles,
  KeyRound,
  Ghost,
  Brain,
  CreditCard,
  Coins,
  Tags,
  Palette,
  BookOpen,
  Mail,
  Search,
  Megaphone,
  UserX,
  Smartphone,
  Bot,
  Terminal,
  Receipt,
  Flag,
  Bell,
  Crown,
  UserCheck,
  ScrollText,
  FileSearch,
  Anvil,
} from "lucide-react"
import { cn } from "@/lib/utils"

type NavItem = {
  href: string
  label: string
  icon: any
  roles: string[]
  group?: string
  permission?: string
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["super_admin", "admin", "operator", "viewer"] },
  // Content
  { href: "/content", label: "Content", icon: FileText, roles: ["super_admin", "admin"], group: "Content", permission: "content" },
  { href: "/characters", label: "Characters", icon: Ghost, roles: ["super_admin", "admin"], group: "Content", permission: "characters" },
  { href: "/comments", label: "Comments", icon: MessageSquare, roles: ["super_admin", "admin", "operator"], group: "Content", permission: "comments" },
  { href: "/tags", label: "Tags", icon: Tags, roles: ["super_admin", "admin"], group: "Content", permission: "tags" },
  { href: "/genres", label: "Genres", icon: BookOpen, roles: ["super_admin", "admin"], group: "Content", permission: "genres" },
  // AI
  { href: "/ai-tasks", label: "AI Tasks", icon: Brain, roles: ["super_admin", "admin"], group: "AI", permission: "ai-tasks" },
  { href: "/ai-generations", label: "AI Generations", icon: Sparkles, roles: ["super_admin", "admin"], group: "AI", permission: "ai-generations" },
  { href: "/agents", label: "Agents", icon: Bot, roles: ["super_admin", "admin"], group: "AI", permission: "agents" },
  { href: "/prompts", label: "Prompts", icon: Terminal, roles: ["super_admin", "admin"], group: "AI", permission: "prompts" },
  { href: "/styles", label: "Styles", icon: Palette, roles: ["super_admin", "admin"], group: "AI", permission: "styles" },
  // Users
  { href: "/users", label: "Users", icon: Users, roles: ["super_admin", "admin"], group: "Users", permission: "users" },
  { href: "/account-deletions", label: "Account Deletions", icon: UserX, roles: ["super_admin", "admin"], group: "Users", permission: "users" },
  { href: "/devices", label: "Devices", icon: Smartphone, roles: ["super_admin", "admin"], group: "Users", permission: "users" },
  // Finance
  { href: "/memberships", label: "Memberships", icon: Crown, roles: ["super_admin", "admin"], group: "Finance", permission: "memberships" },
  { href: "/orders", label: "Orders", icon: Receipt, roles: ["super_admin", "admin"], group: "Finance", permission: "orders" },
  { href: "/tokens", label: "Tokens", icon: Coins, roles: ["super_admin", "admin"], group: "Finance", permission: "tokens" },
  // Growth
  { href: "/invitation-codes", label: "Invitation Codes", icon: Mail, roles: ["super_admin", "admin"], group: "Growth", permission: "invitation-codes" },
  { href: "/referrals", label: "Referrals", icon: UserCheck, roles: ["super_admin", "admin"], group: "Growth", permission: "invitation-codes" },
  { href: "/search-analytics", label: "Search Analytics", icon: Search, roles: ["super_admin", "admin"], group: "Growth", permission: "search" },
  // Community
  { href: "/feedback", label: "Feedback", icon: MessageSquare, roles: ["super_admin", "admin", "operator"], group: "Community", permission: "feedback" },
  { href: "/reports", label: "Reports", icon: Flag, roles: ["super_admin", "admin", "operator"], group: "Community", permission: "reports" },
  { href: "/topics", label: "Topics", icon: Hash, roles: ["super_admin", "admin", "operator"], group: "Community", permission: "topics" },
  { href: "/notifications", label: "Broadcast", icon: Bell, roles: ["super_admin", "admin"], group: "Community", permission: "notifications" },
  // System
  { href: "/admin-users", label: "Admin Users", icon: Shield, roles: ["super_admin"], group: "System" },
  { href: "/audit-log", label: "Audit Log", icon: ScrollText, roles: ["super_admin", "admin"], group: "System", permission: "audit-log" },
]

const groupOrder = ["", "Content", "AI", "Users", "Finance", "Growth", "Community", "System"]

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

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
          <p className="text-sm text-muted-foreground">Loading...</p>
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

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-60 border-r bg-sidebar-bg flex flex-col shadow-sm">
        <div className="flex h-14 items-center gap-2.5 border-b px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
            <Anvil className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold tracking-tight">Forge Admin</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {groupedNav.map((group) => (
            <div key={group.label} className="mb-2">
              {group.label && (
                <div className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">
                  {group.label}
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
                      : "text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:translate-x-0.5 border-l-transparent"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="border-t p-2 bg-muted/30">
          <div className="flex items-center gap-2 px-3 py-2 text-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground text-xs font-medium ring-2 ring-primary/20">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{user.displayName || user.username}</p>
              <p className="truncate text-xs text-muted-foreground">{user.role}</p>
            </div>
          </div>
          <button onClick={() => router.push("/change-password")} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150">
            <KeyRound className="h-4 w-4" />
            Change Password
          </button>
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150">
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div key={pathname} className="p-6 animate-fade-in-up">
          {children}
        </div>
      </main>
    </div>
  )
}
