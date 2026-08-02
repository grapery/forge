"use client"

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"

import { styleApi } from "@/lib/api/admin"

import type { StyleConfigItem } from "@/lib/types"

import { PageHeader } from "@/components/shared/page-header"

import { DataTable } from "@/components/shared/data-table"

import { SearchInput } from "@/components/shared/search-input"

import { Button } from "@/components/ui/button"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

import { Input } from "@/components/ui/input"

import { Label } from "@/components/ui/label"

import { Pencil, Trash2, Palette } from "lucide-react"

import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { AdminPage } from "@/components/layout/admin-page"


export default function StylesPage() {
  const t = useTranslations("styles")
  const tc = useTranslations("common")
  const [items, setItems] = useState<StyleConfigItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const pageSize = 20

  const [editItem, setEditItem] = useState<StyleConfigItem | null>(null)
  const [editDescription, setEditDescription] = useState("")
  const [editSampleImageUrl, setEditSampleImageUrl] = useState("")
  const [saving, setSaving] = useState(false)

  const [deleteItem, setDeleteItem] = useState<StyleConfigItem | null>(null)

  const fetchData = useCallback(() => {
    setLoading(true)
    styleApi
      .list({ page, pageSize, search: search || undefined })
      .then((data) => {
        setItems(data.items || [])
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, search])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const formatTime = (ts: number | null) => {
    if (!ts) return "-"
    return new Date(ts * 1000).toLocaleDateString()
  }

  const handleEdit = async () => {
    if (!editItem) return
    setSaving(true)
    try {
      await styleApi.update(editItem.id, {
        description: editDescription,
        sampleImageUrl: editSampleImageUrl,
      })
      toast.success(t("toastUpdated", { style: editItem.style }))
      setEditItem(null)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || t("toastUpdateFailed"))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    try {
      await styleApi.delete(deleteItem.id)
      toast.success(t("toastDeleted", { style: deleteItem.style }))
      setDeleteItem(null)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || t("toastDeleteFailed"))
    }
  }

  const openEdit = (item: StyleConfigItem) => {
    setEditItem(item)
    setEditDescription(item.description || "")
    setEditSampleImageUrl(item.sampleImageUrl || "")
  }

  return (
    <AdminPage>
      <PageHeader title={t("title")} description={t("description")} icon={Palette} />

      <div className="flex items-center gap-4">
        <div className="w-64">
          <SearchInput onSearch={setSearch} placeholder={t("searchPlaceholder")} />
        </div>
      </div>

      {loading ? (
        <PageSkeleton />
      ) : (
        <DataTable
          data={items}
          pagination={{ page, pageSize, total }}
          onPageChange={setPage}
          columns={[
            {
              key: "style",
              header: t("columnStyle"),
              render: (s: StyleConfigItem) => (
                <span className="text-sm font-medium">{s.style}</span>
              ),
            },
            {
              key: "description",
              header: t("columnDescription"),
              render: (s: StyleConfigItem) => (
                <span className="text-sm text-muted-foreground max-w-[200px] truncate block">
                  {s.description || "-"}
                </span>
              ),
            },
            {
              key: "sampleImageUrl",
              header: t("columnSampleImage"),
              render: (s: StyleConfigItem) =>
                s.sampleImageUrl ? (
                  <a
                    href={s.sampleImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    {t("buttonView")}
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                ),
            },
            {
              key: "userId",
              header: t("columnUserId"),
              render: (s: StyleConfigItem) => (
                <span className="text-xs text-muted-foreground">{s.userId}</span>
              ),
            },
            {
              key: "userName",
              header: t("columnUser"),
              render: (s: StyleConfigItem) => (
                <span className="text-sm text-muted-foreground">{s.userName || "-"}</span>
              ),
            },
            {
              key: "createdAt",
              header: t("columnCreated"),
              render: (s: StyleConfigItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(s.createdAt)}</span>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (s: StyleConfigItem) => (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); openEdit(s) }}
                  >
                    <Pencil className="mr-1 h-3 w-3" />{t("buttonEdit")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={(e) => { e.stopPropagation(); setDeleteItem(s) }}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />{t("buttonDelete")}
                  </Button>
                </div>
              ),
            },
          ]}
        />
      )}

      <Dialog open={!!editItem} onOpenChange={(o) => { if (!o) setEditItem(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dialogEditTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("dialogFieldDescription")}</Label>
              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder={t("dialogPlaceholderDescription")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("dialogFieldSampleImageUrl")}</Label>
              <Input
                value={editSampleImageUrl}
                onChange={(e) => setEditSampleImageUrl(e.target.value)}
                placeholder={t("dialogPlaceholderSampleUrl")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>{tc("cancel")}</Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving ? tc("processing") : tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={(o) => { if (!o) setDeleteItem(null) }}
        title={t("dialogDeleteTitle")}
        description={t("dialogDeleteDescription", { style: deleteItem?.style || "" })}
        confirmLabel={t("buttonDelete")}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </AdminPage>
  )
}
