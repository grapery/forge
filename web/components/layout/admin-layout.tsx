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
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["super_admin", "admin", "operator", "viewer"] },
  { href: "/users", label: "Users", icon: Users, roles: ["super_admin", "admin", "operator"] },
  { href: "/feedback", label: "Feedback", icon: MessageSquare, roles: ["super_admin", "admin", "operator"] },
  { href: "/reports", label: "Reports", icon: Shield, roles: ["super_admin", "admin", "operator"] },
  { href: "/content", label: "Content", icon: FileText, roles: ["super_admin", "admin", "operator"] },
  { href: "/admin-users", label: "Admin Users", icon: Shield, roles: ["super_admin"] },
  { href: "/audit-log", label: "Audit Log", icon: Activity, roles: ["super_admin", "admin"] },
]

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

  const filteredNav = navItems.filter((item) => item.roles.includes(user.role))

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-60 border-r bg-muted/30 flex flex-col">
        <div className="flex h-14 items-center border-b px-4">
          <span className="font-semibold">Forge Admin</span>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {filteredNav.map((item) => (
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
