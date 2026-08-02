"use client"

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"

import { genreApi } from "@/lib/api/admin"

import type { GenreCatalogItem } from "@/lib/types"

import { PageHeader } from "@/components/shared/page-header"

import { DataTable } from "@/components/shared/data-table"

import { Button } from "@/components/ui/button"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

import { Input } from "@/components/ui/input"

import { Label } from "@/components/ui/label"

import { Pencil, BookOpen } from "lucide-react"

import { toast } from "sonner"
import { AdminPage } from "@/components/layout/admin-page"


export default function GenresPage() {
  const t = useTranslations("genres")
  const tc = useTranslations("common")
  const [items, setItems] = useState<GenreCatalogItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const pageSize = 20

  const [editItem, setEditItem] = useState<GenreCatalogItem | null>(null)
  const [editTitleZh, setEditTitleZh] = useState("")
  const [editTitleEn, setEditTitleEn] = useState("")
  const [editTitleJa, setEditTitleJa] = useState("")
  const [editEmoji, setEditEmoji] = useState("")
  const [editSortOrder, setEditSortOrder] = useState(0)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(() => {
    setLoading(true)
    genreApi
      .list({ page, pageSize })
      .then((data) => {
        setItems(data.items || [])
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page])

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
      await genreApi.update(editItem.id, {
        titleZh: editTitleZh,
        titleEn: editTitleEn,
        titleJa: editTitleJa,
        emoji: editEmoji,
        sortOrder: editSortOrder,
      })
      toast.success(t("toastUpdated", { name: editTitleEn }))
      setEditItem(null)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || t("toastUpdateFailed"))
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (item: GenreCatalogItem) => {
    setEditItem(item)
    setEditTitleZh(item.titleZh || "")
    setEditTitleEn(item.titleEn || "")
    setEditTitleJa(item.titleJa || "")
    setEditEmoji(item.emoji || "")
    setEditSortOrder(item.sortOrder ?? 0)
  }

  return (
    <AdminPage>
      <PageHeader title={t("title")} description={t("description")} icon={BookOpen} />

      {loading ? (
        <PageSkeleton />
      ) : (
        <DataTable
          data={items}
          pagination={{ page, pageSize, total }}
          onPageChange={setPage}
          columns={[
            {
              key: "slug",
              header: t("columnSlug"),
              render: (g: GenreCatalogItem) => (
                <span className="text-sm font-medium">{g.slug}</span>
              ),
            },
            {
              key: "titleZh",
              header: t("columnTitleZh"),
              render: (g: GenreCatalogItem) => (
                <span className="text-sm">{g.titleZh || "-"}</span>
              ),
            },
            {
              key: "titleEn",
              header: t("columnTitleEn"),
              render: (g: GenreCatalogItem) => (
                <span className="text-sm">{g.titleEn || "-"}</span>
              ),
            },
            {
              key: "titleJa",
              header: t("columnTitleJa"),
              render: (g: GenreCatalogItem) => (
                <span className="text-sm">{g.titleJa || "-"}</span>
              ),
            },
            {
              key: "emoji",
              header: t("columnEmoji"),
              render: (g: GenreCatalogItem) => (
                <span className="text-sm">{g.emoji || "-"}</span>
              ),
            },
            {
              key: "source",
              header: t("columnSource"),
              render: (g: GenreCatalogItem) => (
                <span className="text-xs text-muted-foreground">{g.source || "-"}</span>
              ),
            },
            {
              key: "sortOrder",
              header: t("columnSortOrder"),
              render: (g: GenreCatalogItem) => (
                <span className="text-sm">{g.sortOrder}</span>
              ),
            },
            {
              key: "pageIndex",
              header: t("columnPageIndex"),
              render: (g: GenreCatalogItem) => (
                <span className="text-sm">{g.pageIndex}</span>
              ),
            },
            {
              key: "createdAt",
              header: t("columnCreated"),
              render: (g: GenreCatalogItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(g.createdAt)}</span>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (g: GenreCatalogItem) => (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); openEdit(g) }}
                  >
                    <Pencil className="mr-1 h-3 w-3" />{t("buttonEdit")}
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
              <Label htmlFor="edit-title-zh">{t("dialogFieldTitleZh")}</Label>
              <Input
                id="edit-title-zh"
                value={editTitleZh}
                onChange={(e) => setEditTitleZh(e.target.value)}
                placeholder={t("dialogPlaceholderTitleZh")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-title-en">{t("dialogFieldTitleEn")}</Label>
              <Input
                id="edit-title-en"
                value={editTitleEn}
                onChange={(e) => setEditTitleEn(e.target.value)}
                placeholder={t("dialogPlaceholderTitleEn")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-title-ja">{t("dialogFieldTitleJa")}</Label>
              <Input
                id="edit-title-ja"
                value={editTitleJa}
                onChange={(e) => setEditTitleJa(e.target.value)}
                placeholder={t("dialogPlaceholderTitleJa")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-emoji">{t("dialogFieldEmoji")}</Label>
              <Input
                id="edit-emoji"
                value={editEmoji}
                onChange={(e) => setEditEmoji(e.target.value)}
                placeholder={t("dialogPlaceholderEmoji")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-sort-order">{t("dialogFieldSortOrder")}</Label>
              <Input
                id="edit-sort-order"
                type="number"
                value={editSortOrder}
                onChange={(e) => setEditSortOrder(Number(e.target.value))}
                placeholder="0"
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
    </AdminPage>
  )
}
