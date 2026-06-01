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
  { href: "/agents", label: "Agents", icon: Sparkles, roles: ["super_admin", "admin"], group: "AI", permission: "agents" },
  { href: "/prompts", label: "Prompts", icon: Sparkles, roles: ["super_admin", "admin"], group: "AI", permission: "prompts" },
  { href: "/styles", label: "Styles", icon: Palette, roles: ["super_admin", "admin"], group: "AI", permission: "styles" },
  // Users
  { href: "/users", label: "Users", icon: Users, roles: ["super_admin", "admin"], group: "Users", permission: "users" },
  { href: "/account-deletions", label: "Account Deletions", icon: UserX, roles: ["super_admin", "admin"], group: "Users", permission: "users" },
  { href: "/devices", label: "Devices", icon: Smartphone, roles: ["super_admin", "admin"], group: "Users", permission: "users" },
  // Finance
  { href: "/memberships", label: "Memberships", icon: CreditCard, roles: ["super_admin", "admin"], group: "Finance", permission: "memberships" },
  { href: "/orders", label: "Orders", icon: CreditCard, roles: ["super_admin", "admin"], group: "Finance", permission: "orders" },
  { href: "/tokens", label: "Tokens", icon: Coins, roles: ["super_admin", "admin"], group: "Finance", permission: "tokens" },
  // Growth
  { href: "/invitation-codes", label: "Invitation Codes", icon: Mail, roles: ["super_admin", "admin"], group: "Growth", permission: "invitation-codes" },
  { href: "/referrals", label: "Referrals", icon: Users, roles: ["super_admin", "admin"], group: "Growth", permission: "invitation-codes" },
  { href: "/search-analytics", label: "Search Analytics", icon: Search, roles: ["super_admin", "admin"], group: "Growth", permission: "search" },
  // Community
  { href: "/feedback", label: "Feedback", icon: MessageSquare, roles: ["super_admin", "admin", "operator"], group: "Community", permission: "feedback" },
  { href: "/reports", label: "Reports", icon: Shield, roles: ["super_admin", "admin", "operator"], group: "Community", permission: "reports" },
  { href: "/topics", label: "Topics", icon: Hash, roles: ["super_admin", "admin", "operator"], group: "Community", permission: "topics" },
  { href: "/notifications", label: "Broadcast", icon: Megaphone, roles: ["super_admin", "admin"], group: "Community", permission: "notifications" },
  // System
  { href: "/admin-users", label: "Admin Users", icon: Shield, roles: ["super_admin"], group: "System" },
  { href: "/audit-log", label: "Audit Log", icon: Activity, roles: ["super_admin", "admin"], group: "System", permission: "audit-log" },
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
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>
  }
  if (!user) return null

  const filteredNav = navItems.filter((item) => {
    if (!item.roles.includes(user.role)) return false
    // For operator and viewer roles, check permissions
    if ((user.role === "operator" || user.role === "viewer") && item.permission) {
      const userPermissions = user.permissions || []
      if (!userPermissions.includes(item.permission)) return false
    }
    return true
  })

  const groupedNav: { label: string; items: NavItem[] }[] = []
  let currentGroup = ""
  for (const group of groupOrder) {
    const items = filteredNav.filter((item) => (item.group || "") === group)
    if (items.length > 0) {
      groupedNav.push({ label: group, items })
      currentGroup = group
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-60 border-r bg-muted/30 flex flex-col">
        <div className="flex h-14 items-center border-b px-4">
          <span className="font-semibold">Forge Admin</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {groupedNav.map((group) => (
            <div key={group.label} className="mb-2">
              {group.label && (
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </div>
              )}
              {group.items.map((item) => (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    pathname.startsWith(item.href) ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="border-t p-2">
          <div className="flex items-center gap-2 px-3 py-2 text-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{user.displayName || user.username}</p>
              <p className="truncate text-xs text-muted-foreground">{user.role}</p>
            </div>
          </div>
          <button onClick={() => router.push("/change-password")} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
            <KeyRound className="h-4 w-4" />
            Change Password
          </button>
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
