"use client"

import { useEffect, useState, useCallback } from "react"
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
import { Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"

export default function TagsPage() {
  const [items, setItems] = useState<TagItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")
  const pageSize = 20

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState("")
  const [createCategory, setCreateCategory] = useState("general")
  const [creating, setCreating] = useState(false)

  // Edit dialog
  const [editItem, setEditItem] = useState<TagItem | null>(null)
  const [editName, setEditName] = useState("")
  const [editCategory, setEditCategory] = useState("")
  const [saving, setSaving] = useState(false)

  // Delete confirm
  const [deleteItem, setDeleteItem] = useState<TagItem | null>(null)
  const [deleting, setDeleting] = useState(false)

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
      toast.success(`Tag "${createName}" created`)
      setCreateOpen(false)
      setCreateName("")
      setCreateCategory("general")
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Failed to create tag")
    } finally {
      setCreating(false)
    }
  }

  const handleEdit = async () => {
    if (!editItem) return
    setSaving(true)
    try {
      await tagApi.update(editItem.id, { name: editName.trim(), category: editCategory })
      toast.success(`Tag "${editName}" updated`)
      setEditItem(null)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Failed to update tag")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    setDeleting(true)
    try {
      await tagApi.delete(deleteItem.id)
      toast.success(`Tag "${deleteItem.name}" deleted`)
      setDeleteItem(null)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete tag")
    } finally {
      setDeleting(false)
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
        title="Tags"
        description="Manage platform tags"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />Create Tag
          </Button>
        }
      />

      <div className="flex items-center gap-4">
        <div className="w-64">
          <SearchInput onSearch={setSearch} placeholder="Search tags..." />
        </div>
        <Select value={category || "all"} onValueChange={(v) => setCategory(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="story">Story</SelectItem>
            <SelectItem value="character">Character</SelectItem>
            <SelectItem value="general">General</SelectItem>
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
          columns={[
            {
              key: "name",
              header: "Name",
              render: (t: TagItem) => (
                <span className="text-sm font-medium">{t.name}</span>
              ),
            },
            {
              key: "category",
              header: "Category",
              render: (t: TagItem) => (
                <Badge variant="secondary">{t.category}</Badge>
              ),
            },
            {
              key: "usageCount",
              header: "Usage Count",
              render: (t: TagItem) => (
                <span className="text-sm">{t.usageCount}</span>
              ),
            },
            {
              key: "createdAt",
              header: "Created",
              render: (t: TagItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(t.createdAt)}</span>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (t: TagItem) => (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); openEdit(t) }}
                  >
                    <Pencil className="mr-1 h-3 w-3" />Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={(e) => { e.stopPropagation(); setDeleteItem(t) }}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />Delete
                  </Button>
                </div>
              ),
            },
          ]}
        />
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Name</Label>
              <Input
                id="create-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Tag name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-category">Category</Label>
              <Select value={createCategory} onValueChange={setCreateCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="story">Story</SelectItem>
                  <SelectItem value="character">Character</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !createName.trim()}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(o) => { if (!o) setEditItem(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Tag name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="story">Story</SelectItem>
                  <SelectItem value="character">Character</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={saving || !editName.trim()}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={(o) => { if (!o) setDeleteItem(null) }}
        title="Delete Tag"
        description={`Are you sure you want to delete "${deleteItem?.name}"?`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
