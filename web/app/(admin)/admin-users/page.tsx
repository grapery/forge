"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"

import { adminUserApi } from "@/lib/api/admin"

import type { AdminUser } from "@/lib/types"

import { useAuth } from "@/providers/auth-provider"

import { PageHeader } from "@/components/shared/page-header"

import { DataTable } from "@/components/shared/data-table"

import { RoleBadge, StatusBadge } from "@/components/shared/status-badge"

import { Button } from "@/components/ui/button"

import { Badge } from "@/components/ui/badge"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

import { MoreHorizontal, Plus, KeyRound, Pencil, Trash2, Shield } from "lucide-react"

import { CreateAdminDialog } from "./create-admin-dialog"

import { EditAdminDialog } from "./edit-admin-dialog"

import { ResetPasswordDialog } from "./reset-password-dialog"

import { DeleteAdminConfirm } from "./delete-confirm"

import { PermissionEditor } from "@/components/admin/permission-editor"
import { AdminPage } from "@/components/layout/admin-page"

const TOTAL_PERMISSIONS = 18

export default function AdminUsersPage() {
  const t = useTranslations("adminUsers")
  const tc = useTranslations("common")
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
  const [permissionsAdmin, setPermissionsAdmin] = useState<AdminUser | null>(null)

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

  const renderPermissions = (u: AdminUser) => {
    if (u.role === "super_admin" || u.role === "admin") {
      return <Badge variant="default">{t("fullAccess")}</Badge>
    }
    const count = u.permissions?.length || 0
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setPermissionsAdmin(u) }}
        className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors cursor-pointer"
      >
        <Shield className="h-3 w-3" />
        {t("permissionCount", { count })}
      </button>
    )
  }

  return (
    <AdminPage>
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Shield}
        actions={
          isSuperAdmin ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("buttonCreate")}
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <PageSkeleton />
      ) : (
        <DataTable
          data={items}
          pagination={{ page, pageSize, total }}
          onPageChange={setPage}
          columns={[
            {
              key: "user",
              header: t("columnUser"),
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
              header: t("columnRole"),
              render: (u: AdminUser) => <RoleBadge role={u.role} />,
            },
            {
              key: "permissions",
              header: t("columnPermissions"),
              render: (u: AdminUser) => renderPermissions(u),
            },
            {
              key: "status",
              header: t("columnStatus"),
              render: (u: AdminUser) => <StatusBadge status={u.status} />,
            },
            {
              key: "lastLogin",
              header: t("columnLastLogin"),
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
                        {t("buttonEdit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setResetAdmin(u)}>
                        <KeyRound className="mr-2 h-4 w-4" />
                        {t("buttonResetPassword")}
                      </DropdownMenuItem>
                      {(u.role === "operator" || u.role === "viewer") && (
                        <DropdownMenuItem onClick={() => setPermissionsAdmin(u)}>
                          <Shield className="mr-2 h-4 w-4" />
                          {t("buttonPermissions")}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeleteAdmin(u)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t("buttonDelete")}
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
      {permissionsAdmin && (
        <PermissionEditor
          userId={permissionsAdmin.id}
          username={permissionsAdmin.displayName || permissionsAdmin.username}
          open={!!permissionsAdmin}
          onOpenChange={(o) => setPermissionsAdmin(o ? permissionsAdmin : null)}
          onSaved={fetchData}
        />
      )}
    </AdminPage>
  )
}
