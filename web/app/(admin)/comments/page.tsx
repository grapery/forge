"use client"

import { useEffect, useState, useCallback } from "react"
import { PageSkeleton } from "@/components/shared/skeleton"

import { commentApi } from "@/lib/api/admin"

import type { CommentItem, CommentStatusCount } from "@/lib/types"

import { PageHeader } from "@/components/shared/page-header"

import { DataTable } from "@/components/shared/data-table"

import { SearchInput } from "@/components/shared/search-input"

import { StatCard } from "@/components/shared/stat-card"

import { Badge } from "@/components/ui/badge"

import { Button } from "@/components/ui/button"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { MessageSquare, BookOpen, Puzzle, Users, Trash2 } from "lucide-react"

import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"


export default function CommentsPage() {
  const [items, setItems] = useState<CommentItem[]>([])
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState<CommentStatusCount | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [targetType, setTargetType] = useState("")
  const pageSize = 20

  const [deleteComment, setDeleteComment] = useState<CommentItem | null>(null)

  const fetchData = useCallback(() => {
    setLoading(true)
    commentApi
      .list({ page, pageSize, search: search || undefined, targetType: targetType || undefined })
      .then((data) => {
        setItems(data.items || [])
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, search, targetType])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    commentApi.statusCounts().then(setCounts).catch(() => {})
  }, [])

  const handleDelete = async () => {
    if (!deleteComment) return
    try {
      await commentApi.delete(deleteComment.id)
      toast.success("Comment deleted")
      setDeleteComment(null)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Delete failed")
    }
  }

  const formatTime = (ts: number | null) => {
    if (!ts) return "-"
    return new Date(ts * 1000).toLocaleDateString()
  }

  const truncate = (text: string, maxLen: number) => {
    if (text.length <= maxLen) return text
    return text.slice(0, maxLen) + "..."
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Comments" description="Manage platform comments" icon={MessageSquare} />

      {counts && (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard title="Total" value={counts.total} icon={MessageSquare} />
          <StatCard title="Story" value={counts.storyComments} icon={BookOpen} />
          <StatCard title="Fragment" value={counts.fragmentComments} icon={Puzzle} />
          <StatCard title="Character" value={counts.characterComments} icon={Users} />
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="w-64">
          <SearchInput onSearch={setSearch} placeholder="Search comments..." />
        </div>
        <Select value={targetType || "all"} onValueChange={(v) => setTargetType(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="story">Story</SelectItem>
            <SelectItem value="fragment">Fragment</SelectItem>
            <SelectItem value="character">Character</SelectItem>
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
              key: "content",
              header: "Content",
              render: (c: CommentItem) => (
                <span className="text-sm" title={c.content}>{truncate(c.content, 60)}</span>
              ),
            },
            {
              key: "author",
              header: "Author",
              render: (c: CommentItem) => (
                <span className="text-sm text-muted-foreground">{c.authorName}</span>
              ),
            },
            {
              key: "targetType",
              header: "Target Type",
              render: (c: CommentItem) => (
                <Badge variant="secondary">{c.targetType}</Badge>
              ),
            },
            {
              key: "targetId",
              header: "Target ID",
              render: (c: CommentItem) => (
                <span className="text-xs text-muted-foreground font-mono">{c.targetId}</span>
              ),
            },
            {
              key: "likes",
              header: "Likes",
              render: (c: CommentItem) => <span className="text-sm">{c.likes}</span>,
            },
            {
              key: "dislikes",
              header: "Dislikes",
              render: (c: CommentItem) => <span className="text-sm">{c.dislikes}</span>,
            },
            {
              key: "replies",
              header: "Replies",
              render: (c: CommentItem) => <span className="text-sm">{c.replyCount}</span>,
            },
            {
              key: "created",
              header: "Created",
              render: (c: CommentItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(c.createdAt)}</span>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (c: CommentItem) => (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={(e) => { e.stopPropagation(); setDeleteComment(c) }}
                >
                  <Trash2 className="mr-1 h-3 w-3" />Delete
                </Button>
              ),
            },
          ]}
        />
      )}

      <ConfirmDialog
        open={!!deleteComment}
        onOpenChange={(o) => { if (!o) setDeleteComment(null) }}
        title="Delete Comment"
        description={`Are you sure you want to delete this comment? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
