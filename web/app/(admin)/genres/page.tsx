"use client"

import { useEffect, useState, useCallback } from "react"
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

export default function GenresPage() {
  const [items, setItems] = useState<GenreCatalogItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const pageSize = 20

  // Edit dialog
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
      toast.success(`Genre "${editTitleEn}" updated`)
      setEditItem(null)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Failed to update genre")
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
    <div className="space-y-6">
      <PageHeader title="Genres" description="Manage system genre catalog" icon={BookOpen} />

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading...</div>
      ) : (
        <DataTable
          data={items}
          pagination={{ page, pageSize, total }}
          onPageChange={setPage}
          columns={[
            {
              key: "slug",
              header: "Slug",
              render: (g: GenreCatalogItem) => (
                <span className="text-sm font-medium">{g.slug}</span>
              ),
            },
            {
              key: "titleZh",
              header: "Title (ZH)",
              render: (g: GenreCatalogItem) => (
                <span className="text-sm">{g.titleZh || "-"}</span>
              ),
            },
            {
              key: "titleEn",
              header: "Title (EN)",
              render: (g: GenreCatalogItem) => (
                <span className="text-sm">{g.titleEn || "-"}</span>
              ),
            },
            {
              key: "titleJa",
              header: "Title (JA)",
              render: (g: GenreCatalogItem) => (
                <span className="text-sm">{g.titleJa || "-"}</span>
              ),
            },
            {
              key: "emoji",
              header: "Emoji",
              render: (g: GenreCatalogItem) => (
                <span className="text-sm">{g.emoji || "-"}</span>
              ),
            },
            {
              key: "source",
              header: "Source",
              render: (g: GenreCatalogItem) => (
                <span className="text-xs text-muted-foreground">{g.source || "-"}</span>
              ),
            },
            {
              key: "sortOrder",
              header: "Sort Order",
              render: (g: GenreCatalogItem) => (
                <span className="text-sm">{g.sortOrder}</span>
              ),
            },
            {
              key: "pageIndex",
              header: "Page Index",
              render: (g: GenreCatalogItem) => (
                <span className="text-sm">{g.pageIndex}</span>
              ),
            },
            {
              key: "createdAt",
              header: "Created",
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
                    <Pencil className="mr-1 h-3 w-3" />Edit
                  </Button>
                </div>
              ),
            },
          ]}
        />
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(o) => { if (!o) setEditItem(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Genre</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title-zh">Title (ZH)</Label>
              <Input
                id="edit-title-zh"
                value={editTitleZh}
                onChange={(e) => setEditTitleZh(e.target.value)}
                placeholder="Chinese title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-title-en">Title (EN)</Label>
              <Input
                id="edit-title-en"
                value={editTitleEn}
                onChange={(e) => setEditTitleEn(e.target.value)}
                placeholder="English title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-title-ja">Title (JA)</Label>
              <Input
                id="edit-title-ja"
                value={editTitleJa}
                onChange={(e) => setEditTitleJa(e.target.value)}
                placeholder="Japanese title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-emoji">Emoji</Label>
              <Input
                id="edit-emoji"
                value={editEmoji}
                onChange={(e) => setEditEmoji(e.target.value)}
                placeholder="Genre emoji"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-sort-order">Sort Order</Label>
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
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
