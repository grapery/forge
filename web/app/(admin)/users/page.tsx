"use client"

import { useEffect, useState, useCallback } from "react"
import { userApi } from "@/lib/api/admin"
import type { PlatformUser, UserStatusCount } from "@/lib/types"
import { useAuth } from "@/providers/auth-provider"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { SearchInput } from "@/components/shared/search-input"
import { StatCard } from "@/components/shared/stat-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users as UsersIcon, UserCheck, UserX, Shield, ShieldOff } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<PlatformUser[]>([])
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState<UserStatusCount | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const pageSize = 20

  const [actionUser, setActionUser] = useState<PlatformUser | null>(null)
  const [actionType, setActionType] = useState<"suspend" | "activate" | null>(null)

  const isAdmin = currentUser?.role === "super_admin" || currentUser?.role === "admin"

  const fetchData = useCallback(() => {
    setLoading(true)
    userApi
      .list({ page, pageSize, search: search || undefined, status: status || undefined })
      .then((data) => {
        setItems(data.items || [])
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, search, status])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    userApi.statusCounts().then(setCounts).catch(() => {})
  }, [])

  const handleUserAction = async () => {
    if (!actionUser || !actionType) return
    try {
      if (actionType === "suspend") {
        await userApi.suspend(actionUser.id)
        toast.success(`User ${actionUser.username} suspended`)
      } else {
        await userApi.activate(actionUser.id)
        toast.success(`User ${actionUser.username} activated`)
      }
      setActionUser(null)
      setActionType(null)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Action failed")
    }
  }

  const formatTime = (ts: number | null) => {
    if (!ts) return "-"
    return new Date(ts * 1000).toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Manage platform users" icon={UsersIcon} />

      {counts && (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard title="Active Users" value={counts.active} icon={UserCheck} />
          <StatCard title="Suspended" value={counts.suspended} icon={UserX} />
          <StatCard title="Total" value={counts.active + counts.suspended} icon={UsersIcon} />
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="w-64">
          <SearchInput onSearch={setSearch} placeholder="Search users..." />
        </div>
        <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading...</div>
      ) : (
        <DataTable
          data={items}
          pagination={{ page, pageSize, total }}
          onPageChange={setPage}
          onRowClick={(u) => router.push(`/users/detail?id=${u.id}`)}
          columns={[
            {
              key: "user",
              header: "User",
              render: (u: PlatformUser) => (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {(u.displayName || u.username).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{u.displayName || u.username}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </div>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (u: PlatformUser) => (
                <Badge variant={u.status === "active" ? "default" : "destructive"}>
                  {u.status}
                </Badge>
              ),
            },
            {
              key: "stats",
              header: "Content",
              render: (u: PlatformUser) => (
                <span className="text-xs text-muted-foreground">
                  {u.storyboardCount} boards, {u.fragmentsCount} fragments
                </span>
              ),
            },
            {
              key: "followers",
              header: "Followers",
              render: (u: PlatformUser) => <span className="text-sm">{u.followers}</span>,
            },
            {
              key: "joined",
              header: "Joined",
              render: (u: PlatformUser) => <span className="text-xs text-muted-foreground">{formatTime(u.createdAt)}</span>,
            },
            {
              key: "actions",
              header: "",
              render: (u: PlatformUser) =>
                isAdmin ? (
                  <div className="flex gap-1">
                    {u.status === "active" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={(e) => { e.stopPropagation(); setActionUser(u); setActionType("suspend") }}
                      >
                        <ShieldOff className="mr-1 h-3 w-3" />Suspend
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setActionUser(u); setActionType("activate") }}
                      >
                        <Shield className="mr-1 h-3 w-3" />Activate
                      </Button>
                    )}
                  </div>
                ) : null,
            },
          ]}
        />
      )}

      <ConfirmDialog
        open={!!actionUser && !!actionType}
        onOpenChange={(o) => { if (!o) { setActionUser(null); setActionType(null) } }}
        title={actionType === "suspend" ? "Suspend User" : "Activate User"}
        description={`Are you sure you want to ${actionType} "${actionUser?.username}"?`}
        confirmLabel={actionType === "suspend" ? "Suspend" : "Activate"}
        variant={actionType === "suspend" ? "destructive" : "default"}
        onConfirm={handleUserAction}
      />
    </div>
  )
}
