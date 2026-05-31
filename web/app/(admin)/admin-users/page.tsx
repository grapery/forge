"use client"

import { useEffect, useState } from "react"
import { adminUserApi } from "@/lib/api/admin"
import type { AdminUser } from "@/lib/types"
import { useAuth } from "@/providers/auth-provider"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { RoleBadge, StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Plus, KeyRound, Pencil, Trash2 } from "lucide-react"
import { CreateAdminDialog } from "./create-admin-dialog"
import { EditAdminDialog } from "./edit-admin-dialog"
import { ResetPasswordDialog } from "./reset-password-dialog"
import { DeleteAdminConfirm } from "./delete-confirm"

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth()
  const [items, setItems] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const pageSize = 20

  const [createOpen, setCreateOpen] = useState(false)
  const [editAdmin, setEditAdmin] = useState<AdminUser | null>(null)
  const [resetAdmin, setResetAdmin] = useState<AdminUser | null>(null)
  const [deleteAdmin, setDeleteAdmin] = useState<AdminUser | null>(null)

  const isSuperAdmin = currentUser?.role === "super_admin"

  const fetchData = () => {
    setLoading(true)
    adminUserApi
      .list(page, pageSize)
      .then((data) => {
        setItems(data.items || [])
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchData()
  }, [page])

  const formatTime = (ts?: number | null) => {
    if (!ts) return "-"
    return new Date(ts * 1000).toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Users"
        description="Manage admin accounts and roles"
        actions={
          isSuperAdmin ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Admin
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading...</div>
      ) : (
        <DataTable
          data={items}
          pagination={{ page, pageSize, total }}
          onPageChange={setPage}
          columns={[
            {
              key: "user",
              header: "User",
              render: (u: AdminUser) => (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                    {u.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{u.displayName || u.username}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </div>
              ),
            },
            {
              key: "role",
              header: "Role",
              render: (u: AdminUser) => <RoleBadge role={u.role} />,
            },
            {
              key: "status",
              header: "Status",
              render: (u: AdminUser) => <StatusBadge status={u.status} />,
            },
            {
              key: "lastLogin",
              header: "Last Login",
              render: (u: AdminUser) => (
                <span className="text-xs text-muted-foreground">{formatTime(u.lastLoginAt)}</span>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (u: AdminUser) =>
                isSuperAdmin && u.id !== currentUser?.id ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditAdmin(u)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setResetAdmin(u)}>
                        <KeyRound className="mr-2 h-4 w-4" />
                        Reset Password
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeleteAdmin(u)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null,
            },
          ]}
        />
      )}

      <CreateAdminDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={fetchData} />
      <EditAdminDialog open={!!editAdmin} onOpenChange={(o) => setEditAdmin(o ? editAdmin : null)} admin={editAdmin} onSuccess={fetchData} />
      <ResetPasswordDialog open={!!resetAdmin} onOpenChange={(o) => setResetAdmin(o ? resetAdmin : null)} admin={resetAdmin} />
      <DeleteAdminConfirm open={!!deleteAdmin} onOpenChange={(o) => setDeleteAdmin(o ? deleteAdmin : null)} admin={deleteAdmin} onSuccess={fetchData} />
    </div>
  )
}
