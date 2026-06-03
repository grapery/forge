"use client"

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
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
  const t = useTranslations("comments")
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
      toast.success(t("toastDeleted"))
      setDeleteComment(null)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || t("toastDeleteFailed"))
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
      <PageHeader title={t("title")} description={t("description")} icon={MessageSquare} />

      {counts && (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard title={t("statTotal")} value={counts.total} icon={MessageSquare} />
          <StatCard title={t("statStory")} value={counts.storyComments} icon={BookOpen} />
          <StatCard title={t("statFragment")} value={counts.fragmentComments} icon={Puzzle} />
          <StatCard title={t("statCharacter")} value={counts.characterComments} icon={Users} />
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="w-64">
          <SearchInput onSearch={setSearch} placeholder={t("searchPlaceholder")} />
        </div>
        <Select value={targetType || "all"} onValueChange={(v) => setTargetType(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("filterAllTypes")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAllTypes")}</SelectItem>
            <SelectItem value="story">{t("filterStory")}</SelectItem>
            <SelectItem value="fragment">{t("filterFragment")}</SelectItem>
            <SelectItem value="character">{t("filterCharacter")}</SelectItem>
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
              header: t("columnContent"),
              render: (c: CommentItem) => (
                <span className="text-sm" title={c.content}>{truncate(c.content, 60)}</span>
              ),
            },
            {
              key: "author",
              header: t("columnAuthor"),
              render: (c: CommentItem) => (
                <span className="text-sm text-muted-foreground">{c.authorName}</span>
              ),
            },
            {
              key: "targetType",
              header: t("columnTargetType"),
              render: (c: CommentItem) => (
                <Badge variant="secondary">{c.targetType}</Badge>
              ),
            },
            {
              key: "targetId",
              header: t("columnTargetId"),
              render: (c: CommentItem) => (
                <span className="text-xs text-muted-foreground font-mono">{c.targetId}</span>
              ),
            },
            {
              key: "likes",
              header: t("columnLikes"),
              render: (c: CommentItem) => <span className="text-sm">{c.likes}</span>,
            },
            {
              key: "dislikes",
              header: t("columnDislikes"),
              render: (c: CommentItem) => <span className="text-sm">{c.dislikes}</span>,
            },
            {
              key: "replies",
              header: t("columnReplies"),
              render: (c: CommentItem) => <span className="text-sm">{c.replyCount}</span>,
            },
            {
              key: "created",
              header: t("columnCreated"),
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
                  <Trash2 className="mr-1 h-3 w-3" />{t("buttonDelete")}
                </Button>
              ),
            },
          ]}
        />
      )}

      <ConfirmDialog
        open={!!deleteComment}
        onOpenChange={(o) => { if (!o) setDeleteComment(null) }}
        title={t("dialogDeleteTitle")}
        description={t("dialogDeleteDescription")}
        confirmLabel={t("buttonDelete")}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
