import type { LucideIcon } from "lucide-react"
import {
  LayoutDashboard, Users, FileText, Shield,
  MessageSquare, MessageCircle, Hash, Sparkles, KeyRound, Ghost, Brain,
  CreditCard, Coins, Tags, Palette, BookOpen, Mail, Search,
  UserX, Smartphone, Bot, Terminal, Receipt, Flag, Bell,
  Crown, UserCheck, ScrollText, BarChart3, Layers, Share2,
} from "lucide-react"

export type NavGroup = "" | "analytics" | "support" | "operations" | "settings"

export type OpsSubgroup = "content" | "ai" | "users" | "monetization"

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  roles: string[]
  group?: NavGroup
  subgroup?: OpsSubgroup
  permission?: string
  description?: string
}

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "dashboard", icon: LayoutDashboard, roles: ["super_admin", "admin", "operator", "viewer"] },
  { href: "/analytics/users", label: "analyticsUsers", icon: BarChart3, roles: ["super_admin", "admin"], group: "analytics", permission: "users", description: "hubDescAnalyticsUsers" },
  { href: "/analytics/content", label: "analyticsContent", icon: BookOpen, roles: ["super_admin", "admin"], group: "analytics", permission: "content", description: "hubDescAnalyticsContent" },
  { href: "/analytics/revenue", label: "analyticsRevenue", icon: CreditCard, roles: ["super_admin", "admin"], group: "analytics", permission: "orders", description: "hubDescAnalyticsRevenue" },
  { href: "/analytics/ai", label: "analyticsAi", icon: Brain, roles: ["super_admin", "admin"], group: "analytics", permission: "ai-tasks", description: "hubDescAnalyticsAi" },
  { href: "/analytics/shares", label: "analyticsShares", icon: Share2, roles: ["super_admin", "admin"], group: "analytics", permission: "content", description: "hubDescAnalyticsShares" },
  { href: "/search-analytics", label: "searchAnalytics", icon: Search, roles: ["super_admin", "admin"], group: "analytics", permission: "search", description: "hubDescSearchAnalytics" },
  { href: "/feedback", label: "feedback", icon: MessageSquare, roles: ["super_admin", "admin", "operator"], group: "support", permission: "feedback", description: "hubDescFeedback" },
  { href: "/reports", label: "reports", icon: Flag, roles: ["super_admin", "admin", "operator"], group: "support", permission: "reports", description: "hubDescReports" },
  { href: "/comments", label: "comments", icon: MessageCircle, roles: ["super_admin", "admin", "operator"], group: "support", permission: "comments", description: "hubDescComments" },
  { href: "/notifications", label: "notificationsInbox", icon: Bell, roles: ["super_admin", "admin"], group: "support", permission: "notifications", description: "hubDescNotifications" },
  { href: "/content", label: "content", icon: FileText, roles: ["super_admin", "admin"], group: "operations", subgroup: "content", permission: "content", description: "hubDescContent" },
  { href: "/fragments", label: "fragments", icon: BookOpen, roles: ["super_admin", "admin"], group: "operations", subgroup: "content", permission: "content", description: "hubDescFragments" },
  { href: "/storyboards", label: "storyboards", icon: Layers, roles: ["super_admin", "admin"], group: "operations", subgroup: "content", permission: "content", description: "hubDescStoryboards" },
  { href: "/characters", label: "characters", icon: Ghost, roles: ["super_admin", "admin"], group: "operations", subgroup: "content", permission: "characters", description: "hubDescCharacters" },
  { href: "/tags", label: "tags", icon: Tags, roles: ["super_admin", "admin"], group: "operations", subgroup: "content", permission: "tags", description: "hubDescTags" },
  { href: "/genres", label: "genres", icon: BookOpen, roles: ["super_admin", "admin"], group: "operations", subgroup: "content", permission: "genres", description: "hubDescGenres" },
  { href: "/topics", label: "topics", icon: Hash, roles: ["super_admin", "admin", "operator"], group: "operations", subgroup: "content", permission: "topics", description: "hubDescTopics" },
  { href: "/ai-tasks", label: "aiTasks", icon: Brain, roles: ["super_admin", "admin"], group: "operations", subgroup: "ai", permission: "ai-tasks", description: "hubDescAiTasks" },
  { href: "/ai-generations", label: "aiGenerations", icon: Sparkles, roles: ["super_admin", "admin"], group: "operations", subgroup: "ai", permission: "ai-generations", description: "hubDescAiGenerations" },
  { href: "/agents", label: "agents", icon: Bot, roles: ["super_admin", "admin"], group: "operations", subgroup: "ai", permission: "agents", description: "hubDescAgents" },
  { href: "/prompts", label: "prompts", icon: Terminal, roles: ["super_admin", "admin"], group: "operations", subgroup: "ai", permission: "prompts", description: "hubDescPrompts" },
  { href: "/users", label: "users", icon: Users, roles: ["super_admin", "admin"], group: "operations", subgroup: "users", permission: "users", description: "hubDescUsers" },
  { href: "/account-deletions", label: "accountDeletions", icon: UserX, roles: ["super_admin", "admin"], group: "operations", subgroup: "users", permission: "users", description: "hubDescAccountDeletions" },
  { href: "/devices", label: "devices", icon: Smartphone, roles: ["super_admin", "admin"], group: "operations", subgroup: "users", permission: "users", description: "hubDescDevices" },
  { href: "/memberships", label: "memberships", icon: Crown, roles: ["super_admin", "admin"], group: "operations", subgroup: "monetization", permission: "memberships", description: "hubDescMemberships" },
  { href: "/plans", label: "plans", icon: CreditCard, roles: ["super_admin", "admin"], group: "operations", subgroup: "monetization", permission: "memberships", description: "hubDescPlans" },
  { href: "/orders", label: "orders", icon: Receipt, roles: ["super_admin", "admin"], group: "operations", subgroup: "monetization", permission: "orders", description: "hubDescOrders" },
  { href: "/tokens", label: "tokens", icon: Coins, roles: ["super_admin", "admin"], group: "operations", subgroup: "monetization", permission: "tokens", description: "hubDescTokens" },
  { href: "/invitation-codes", label: "invitationCodes", icon: Mail, roles: ["super_admin", "admin"], group: "operations", subgroup: "monetization", permission: "invitation-codes", description: "hubDescInvitationCodes" },
  { href: "/referrals", label: "referrals", icon: UserCheck, roles: ["super_admin", "admin"], group: "operations", subgroup: "monetization", permission: "invitation-codes", description: "hubDescReferrals" },
  { href: "/admin-users", label: "adminUsers", icon: Shield, roles: ["super_admin"], group: "settings", description: "hubDescAdminUsers" },
  { href: "/audit-log", label: "auditLog", icon: ScrollText, roles: ["super_admin", "admin"], group: "settings", permission: "audit-log", description: "hubDescAuditLog" },
  { href: "/styles", label: "styles", icon: Palette, roles: ["super_admin", "admin"], group: "settings", permission: "styles", description: "hubDescStyles" },
  { href: "/change-password", label: "changePassword", icon: KeyRound, roles: ["super_admin", "admin", "operator", "viewer"], group: "settings", description: "hubDescChangePassword" },
]

export const topSections = [
  { id: "dashboard" as const, href: "/dashboard", label: "dashboard" },
  { id: "analytics" as const, href: "/analytics", label: "groupAnalytics" },
  { id: "support" as const, href: "/support", label: "groupSupport" },
  { id: "operations" as const, href: "/operations", label: "groupOperations" },
  { id: "settings" as const, href: "/settings", label: "groupSettings" },
]

export function visibleTopSections(user: { role: string; permissions?: string[] }) {
  return topSections.filter((section) => {
    if (section.id === "dashboard") return true
    const group = section.id as NavGroup
    return itemsForGroup(group, user).length > 0
  })
}

export function filterNavItems(
  items: NavItem[],
  user: { role: string; permissions?: string[] },
): NavItem[] {
  return items.filter((item) => {
    if (!item.roles.includes(user.role)) return false
    if ((user.role === "operator" || user.role === "viewer") && item.permission) {
      const userPermissions = user.permissions || []
      if (!userPermissions.includes(item.permission)) return false
    }
    return true
  })
}

export function itemsForGroup(group: NavGroup, user: { role: string; permissions?: string[] }): NavItem[] {
  return filterNavItems(
    navItems.filter((item) => (item.group || "") === group),
    user,
  )
}

export function resolveActiveGroup(pathname: string): NavGroup | "dashboard" | "ops-assistant" {
  if (pathname.startsWith("/ops-assistant")) return "ops-assistant"
  if (pathname.startsWith("/dashboard") || pathname === "/") return "dashboard"
  if (pathname.startsWith("/analytics") || pathname.startsWith("/search-analytics")) return "analytics"
  if (
    pathname === "/support" ||
    pathname.startsWith("/feedback") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/comments") ||
    pathname.startsWith("/notifications")
  ) {
    return "support"
  }
  if (
    pathname === "/settings" ||
    pathname.startsWith("/admin-users") ||
    pathname.startsWith("/audit-log") ||
    pathname.startsWith("/styles") ||
    pathname.startsWith("/change-password")
  ) {
    return "settings"
  }
  return "operations"
}

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/"
  return pathname === href || pathname.startsWith(href + "/") || pathname.startsWith(href + "?")
}

export const opsSubgroupOrder: OpsSubgroup[] = ["content", "ai", "users", "monetization"]

export function groupOpsItems(items: NavItem[]): { key: OpsSubgroup | "other"; items: NavItem[] }[] {
  const buckets = new Map<OpsSubgroup | "other", NavItem[]>()
  for (const item of items) {
    const key = item.subgroup || "other"
    const list = buckets.get(key) || []
    list.push(item)
    buckets.set(key, list)
  }
  const ordered: { key: OpsSubgroup | "other"; items: NavItem[] }[] = []
  for (const key of opsSubgroupOrder) {
    const list = buckets.get(key)
    if (list?.length) ordered.push({ key, items: list })
  }
  const other = buckets.get("other")
  if (other?.length) ordered.push({ key: "other", items: other })
  return ordered
}

export type HubBadge = {
  value: number | string
  tone?: "danger" | "warning" | "neutral"
}
