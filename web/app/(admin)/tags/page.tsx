"use client"

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"

import { tagApi } from "@/lib/api/admin"

import type { TagItem } from "@/lib/types"

import { PageHeader } from "@/components/shared/page-header"

import { DataTable } from "@/components/shared/data-table"

import { SearchInput } from "@/components/shared/search-input"

import { Badge } from "@/components/ui/badge"

import { Button } from "@/components/ui/button"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

import { Input } from "@/components/ui/input"

import { Label } from "@/components/ui/label"

import { Plus, Pencil, Trash2, Tags } from "lucide-react"

import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"


export default function TagsPage() {
  const t = useTranslations("tags")
  const tc = useTranslations("common")
  const [items, setItems] = useState<TagItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")
  const pageSize = 20

  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState("")
  const [createCategory, setCreateCategory] = useState("general")
  const [creating, setCreating] = useState(false)

  const [editItem, setEditItem] = useState<TagItem | null>(null)
  const [editName, setEditName] = useState("")
  const [editCategory, setEditCategory] = useState("")
  const [saving, setSaving] = useState(false)

  const [deleteItem, setDeleteItem] = useState<TagItem | null>(null)

  const fetchData = useCallback(() => {
    setLoading(true)
    tagApi
      .list({ page, pageSize, search: search || undefined, category: category || undefined })
      .then((data) => {
        setItems(data.items || [])
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, search, category])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const formatTime = (ts: number | null) => {
    if (!ts) return "-"
    return new Date(ts * 1000).toLocaleDateString()
  }

  const handleCreate = async () => {
    if (!createName.trim()) return
    setCreating(true)
    try {
      await tagApi.create({ name: createName.trim(), category: createCategory })
      toast.success(t("toastCreated", { name: createName }))
      setCreateOpen(false)
      setCreateName("")
      setCreateCategory("general")
      fetchData()
    } catch (err: any) {
      toast.error(err.message || t("toastCreateFailed"))
    } finally {
      setCreating(false)
    }
  }

  const handleEdit = async () => {
    if (!editItem) return
    setSaving(true)
    try {
      await tagApi.update(editItem.id, { name: editName.trim(), category: editCategory })
      toast.success(t("toastUpdated", { name: editName }))
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
      await tagApi.delete(deleteItem.id)
      toast.success(t("toastDeleted", { name: deleteItem.name }))
      setDeleteItem(null)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || t("toastDeleteFailed"))
    }
  }

  const openEdit = (item: TagItem) => {
    setEditItem(item)
    setEditName(item.name)
    setEditCategory(item.category)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Tags}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />{t("buttonCreateTag")}
          </Button>
        }
      />

      <div className="flex items-center gap-4">
        <div className="w-64">
          <SearchInput onSearch={setSearch} placeholder={t("searchPlaceholder")} />
        </div>
        <Select value={category || "all"} onValueChange={(v) => setCategory(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("filterAllCategories")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAllCategories")}</SelectItem>
            <SelectItem value="story">{t("filterStory")}</SelectItem>
            <SelectItem value="character">{t("filterCharacter")}</SelectItem>
            <SelectItem value="general">{t("filterGeneral")}</SelectItem>
          </SelectContent>
        </Select>
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
              key: "name",
              header: t("columnName"),
              render: (item: TagItem) => (
                <span className="text-sm font-medium">{item.name}</span>
              ),
            },
            {
              key: "category",
              header: t("columnCategory"),
              render: (item: TagItem) => (
                <Badge variant="secondary">{item.category}</Badge>
              ),
            },
            {
              key: "usageCount",
              header: t("columnUsageCount"),
              render: (item: TagItem) => (
                <span className="text-sm">{item.usageCount}</span>
              ),
            },
            {
              key: "createdAt",
              header: t("columnCreated"),
              render: (item: TagItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(item.createdAt)}</span>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (item: TagItem) => (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); openEdit(item) }}
                  >
                    <Pencil className="mr-1 h-3 w-3" />{t("buttonEdit")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={(e) => { e.stopPropagation(); setDeleteItem(item) }}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />{t("buttonDelete")}
                  </Button>
                </div>
              ),
            },
          ]}
        />
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dialogCreateTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">{t("dialogFieldName")}</Label>
              <Input
                id="create-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder={t("dialogPlaceholderName")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-category">{t("dialogFieldCategory")}</Label>
              <Select value={createCategory} onValueChange={setCreateCategory}>
                <SelectTrigger>
                  <SelectValue placeholder={t("dialogPlaceholderCategory")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="story">{t("filterStory")}</SelectItem>
                  <SelectItem value="character">{t("filterCharacter")}</SelectItem>
                  <SelectItem value="general">{t("filterGeneral")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{tc("cancel")}</Button>
            <Button onClick={handleCreate} disabled={creating || !createName.trim()}>
              {creating ? tc("processing") : t("buttonCreateTag")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={(o) => { if (!o) setEditItem(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dialogEditTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t("dialogFieldName")}</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={t("dialogPlaceholderName")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">{t("dialogFieldCategory")}</Label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger>
                  <SelectValue placeholder={t("dialogPlaceholderCategory")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="story">{t("filterStory")}</SelectItem>
                  <SelectItem value="character">{t("filterCharacter")}</SelectItem>
                  <SelectItem value="general">{t("filterGeneral")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>{tc("cancel")}</Button>
            <Button onClick={handleEdit} disabled={saving || !editName.trim()}>
              {saving ? tc("processing") : tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={(o) => { if (!o) setDeleteItem(null) }}
        title={t("dialogDeleteTitle")}
        description={t("dialogDeleteDescription", { name: deleteItem?.name || "" })}
        confirmLabel={t("buttonDelete")}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
