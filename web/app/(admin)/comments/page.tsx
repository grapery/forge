"use client"

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"
import { useRouter, useSearchParams } from "next/navigation"

import { commentApi } from "@/lib/api/admin"

import type { CommentItem, CommentStatusCount } from "@/lib/types"

import { PageHeader } from "@/components/shared/page-header"

import { DataTable } from "@/components/shared/data-table"

import { StatCard } from "@/components/shared/stat-card"

import { Badge } from "@/components/ui/badge"

import { Button } from "@/components/ui/button"

import { Input } from "@/components/ui/input"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { MessageSquare, BookOpen, Puzzle, Users, Trash2, Search } from "lucide-react"

import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"


export default function CommentsPage() {
  const t = useTranslations("comments")
  const router = useRouter()
  const searchParams = useSearchParams()
  const authorIdFilter = searchParams.get("authorId") || searchParams.get("userId") || ""
  const targetIdFilter = searchParams.get("targetId") || ""

  const [items, setItems] = useState<CommentItem[]>([])
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState<CommentStatusCount | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState(searchParams.get("search") || searchParams.get("keyword") || "")
  const [keywordDraft, setKeywordDraft] = useState(searchParams.get("search") || searchParams.get("keyword") || "")
  const [targetType, setTargetType] = useState(searchParams.get("targetType") || "")
  const pageSize = 20

  const [deleteComment, setDeleteComment] = useState<CommentItem | null>(null)

  const fetchData = useCallback(() => {
    setLoading(true)
    commentApi
      .list({
        page,
        pageSize,
        search: keyword || undefined,
        targetType: targetType || undefined,
        targetId: targetIdFilter || undefined,
        authorId: authorIdFilter || undefined,
      })
      .then((data) => {
        setItems(data.items || [])
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, keyword, targetType, authorIdFilter, targetIdFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    commentApi.statusCounts().then(setCounts).catch(() => {})
  }, [])

  const syncUrl = (next: { search?: string; targetType?: string }) => {
    const params = new URLSearchParams()
    const search = next.search !== undefined ? next.search : keyword
    const type = next.targetType !== undefined ? next.targetType : targetType
    if (search) params.set("search", search)
    if (type) params.set("targetType", type)
    if (authorIdFilter) params.set("authorId", authorIdFilter)
    if (targetIdFilter) params.set("targetId", targetIdFilter)
    const qs = params.toString()
    router.replace(qs ? `/comments?${qs}` : "/comments")
  }

  const applyKeyword = () => {
    const next = keywordDraft.trim()
    setKeyword(next)
    setPage(1)
    syncUrl({ search: next })
  }

  const applyTargetType = (next: string) => {
    setTargetType(next)
    setPage(1)
    syncUrl({ targetType: next })
  }

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

  const targetHref = (c: CommentItem) => {
    if (!c.targetId) return null
    if (c.targetType === "character") return `/characters/detail?id=${c.targetId}`
    if (c.targetType === "story" || c.targetType === "storyboard" || c.targetType === "fragment") {
      return `/content/detail?id=${c.targetId}&type=${c.targetType}`
    }
    return null
  }

  const clearFilters = () => {
    setPage(1)
    router.push("/comments")
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

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          <Input
            value={keywordDraft}
            onChange={(e) => setKeywordDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") applyKeyword() }}
            placeholder={t("searchPlaceholder")}
            className="w-64"
          />
          <Button variant="outline" size="icon" onClick={applyKeyword} aria-label={t("searchPlaceholder")}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Select
          value={targetType || "all"}
          onValueChange={(v) => applyTargetType(v === "all" ? "" : v)}
        >
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
        {(authorIdFilter || targetIdFilter) && (
          <Button variant="outline" size="sm" onClick={clearFilters}>
            {t("clearAuthorFilter")}
          </Button>
        )}
      </div>

      {authorIdFilter && (
        <p className="text-sm text-muted-foreground">
          {t("filteringByAuthor", { id: authorIdFilter })}
        </p>
      )}
      {targetIdFilter && (
        <p className="text-sm text-muted-foreground">
          {t("filteringByTarget", { id: targetIdFilter })}
        </p>
      )}

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
                <button
                  type="button"
                  className="text-sm text-primary hover:underline"
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/users/detail?id=${c.authorId}`)
                  }}
                >
                  {c.authorName || c.authorId}
                </button>
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
              render: (c: CommentItem) => {
                const href = targetHref(c)
                if (href) {
                  return (
                    <button
                      type="button"
                      className="text-xs font-mono text-primary hover:underline"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(href)
                      }}
                    >
                      {c.targetId}
                    </button>
                  )
                }
                return <span className="text-xs text-muted-foreground font-mono">{c.targetId}</span>
              },
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
