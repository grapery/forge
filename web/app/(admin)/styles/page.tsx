"use client"

import { useEffect, useState, useCallback } from "react"
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


export default function StylesPage() {
  const [items, setItems] = useState<StyleConfigItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const pageSize = 20

  // Edit dialog
  const [editItem, setEditItem] = useState<StyleConfigItem | null>(null)
  const [editDescription, setEditDescription] = useState("")
  const [editSampleImageUrl, setEditSampleImageUrl] = useState("")
  const [saving, setSaving] = useState(false)

  // Delete confirm
  const [deleteItem, setDeleteItem] = useState<StyleConfigItem | null>(null)
  const [deleting, setDeleting] = useState(false)

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
      toast.success(`Style "${editItem.style}" updated`)
      setEditItem(null)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Failed to update style")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    setDeleting(true)
    try {
      await styleApi.delete(deleteItem.id)
      toast.success(`Style "${deleteItem.style}" deleted`)
      setDeleteItem(null)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete style")
    } finally {
      setDeleting(false)
    }
  }

  const openEdit = (item: StyleConfigItem) => {
    setEditItem(item)
    setEditDescription(item.description || "")
    setEditSampleImageUrl(item.sampleImageUrl || "")
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Styles" description="Manage platform style configurations" icon={Palette} />

      <div className="flex items-center gap-4">
        <div className="w-64">
          <SearchInput onSearch={setSearch} placeholder="Search styles..." />
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
              header: "Style",
              render: (s: StyleConfigItem) => (
                <span className="text-sm font-medium">{s.style}</span>
              ),
            },
            {
              key: "description",
              header: "Description",
              render: (s: StyleConfigItem) => (
                <span className="text-sm text-muted-foreground max-w-[200px] truncate block">
                  {s.description || "-"}
                </span>
              ),
            },
            {
              key: "sampleImageUrl",
              header: "Sample Image",
              render: (s: StyleConfigItem) =>
                s.sampleImageUrl ? (
                  <a
                    href={s.sampleImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline"
                  >
                    View
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                ),
            },
            {
              key: "userId",
              header: "User ID",
              render: (s: StyleConfigItem) => (
                <span className="text-xs text-muted-foreground">{s.userId}</span>
              ),
            },
            {
              key: "userName",
              header: "User",
              render: (s: StyleConfigItem) => (
                <span className="text-sm text-muted-foreground">{s.userName || "-"}</span>
              ),
            },
            {
              key: "createdAt",
              header: "Created",
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
                    <Pencil className="mr-1 h-3 w-3" />Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={(e) => { e.stopPropagation(); setDeleteItem(s) }}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />Delete
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
            <DialogTitle>Edit Style</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Edit Description</Label>
              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Style description"
              />
            </div>
            <div className="space-y-2">
              <Label>Sample Image URL</Label>
              <Input
                value={editSampleImageUrl}
                onChange={(e) => setEditSampleImageUrl(e.target.value)}
                placeholder="https://..."
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

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={(o) => { if (!o) setDeleteItem(null) }}
        title="Delete Style"
        description={`Are you sure you want to delete "${deleteItem?.style}"?`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
