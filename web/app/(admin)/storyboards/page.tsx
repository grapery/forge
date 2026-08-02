"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"

import { contentApi } from "@/lib/api/admin"

import type { ContentItem, ContentStatusCount } from "@/lib/types"

import { PageHeader } from "@/components/shared/page-header"

import { DataTable } from "@/components/shared/data-table"

import { SearchInput } from "@/components/shared/search-input"

import { StatCard } from "@/components/shared/stat-card"

import { Badge } from "@/components/ui/badge"

import { Button } from "@/components/ui/button"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { Input } from "@/components/ui/input"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"

import { Layers, Eye, CheckCircle2, FileEdit, Trash2 } from "lucide-react"

import { toast } from "sonner"
import { AdminPage } from "@/components/layout/admin-page"


const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  published: "default",
  draft: "secondary",
}


export default function StoryboardsPage() {
  const router = useRouter()
  const t = useTranslations("storyboards")
  const [items, setItems] = useState<ContentItem[]>([])
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState<ContentStatusCount | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [authorId, setAuthorId] = useState("")
  const pageSize = 20

  const [actionItem, setActionItem] = useState<ContentItem | null>(null)
  const [actionType, setActionType] = useState<string | null>(null)

  const fetchData = useCallback(() => {
    setLoading(true)
    contentApi
      .list({
        page,
        pageSize,
        contentType: "storyboard",
        search: search || undefined,
        status: status || undefined,
        authorId: authorId || undefined,
      })
      .then((data) => {
        setItems(data.items || [])
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, search, status, authorId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    contentApi.statusCounts("storyboard").then(setCounts).catch(() => {})
  }, [])

  const handleAction = async () => {
    if (!actionItem || !actionType) return
    try {
      await contentApi.action("storyboard", actionItem.id, { action: actionType })
      toast.success(actionType === "unpublish" ? t("toastUnpublished") : t("toastDeleted"))
      setActionItem(null)
      setActionType(null)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Action failed")
    }
  }

  const formatTime = (ts: number) => new Date(ts * 1000).toLocaleString()

  const titlePreview = (text: string) => {
    if (!text) return "-"
    return text.length > 60 ? text.slice(0, 60) + "..." : text
  }

  return (
    <AdminPage>
      <PageHeader title={t("title")} description={t("description")} icon={Layers} />

      {counts && (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard title={t("statTotal")} value={counts.total} icon={Layers} />
          <StatCard title={t("statPublished")} value={counts.published} icon={CheckCircle2} />
          <StatCard title={t("statDraft")} value={counts.draft + counts.other} icon={FileEdit} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <div className="w-64">
          <SearchInput onSearch={(v) => { setSearch(v); setPage(1) }} placeholder={t("searchPlaceholder")} />
        </div>

        <Select value={status || "all"} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("filterAllStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAllStatus")}</SelectItem>
            <SelectItem value="published">{t("filterPublished")}</SelectItem>
            <SelectItem value="draft">{t("filterDraft")}</SelectItem>
          </SelectContent>
        </Select>

        <Input
          value={authorId}
          onChange={(e) => setAuthorId(e.target.value)}
          onBlur={() => setPage(1)}
          placeholder={t("filterAuthor")}
          className="w-48"
        />
      </div>

      {loading ? (
        <PageSkeleton />
      ) : (
        <DataTable
          data={items}
          pagination={{ page, pageSize, total }}
          onPageChange={setPage}
          onRowClick={(item) => router.push(`/storyboards/detail?id=${item.id}`)}
          columns={[
            {
              key: "title",
              header: t("columnTitle"),
              render: (item: ContentItem) => (
                <span className="font-medium" title={item.title}>{titlePreview(item.title)}</span>
              ),
            },
            {
              key: "author",
              header: t("columnAuthor"),
              render: (item: ContentItem) => (
                <span className="text-sm text-muted-foreground">{item.authorName || item.authorId}</span>
              ),
            },
            {
              key: "status",
              header: t("columnStatus"),
              render: (item: ContentItem) => (
                <Badge variant={statusVariant[item.status] || "secondary"}>{item.status}</Badge>
              ),
            },
            {
              key: "engagement",
              header: t("columnEngagement"),
              render: (item: ContentItem) => (
                <span className="text-xs text-muted-foreground">{t("likesComments", { likes: item.likes, comments: item.comments })}</span>
              ),
            },
            {
              key: "createdAt",
              header: t("columnCreated"),
              render: (item: ContentItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(item.createdAt)}</span>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (item: ContentItem) => (
                <div className="flex gap-1">
                  {item.status === "published" && (
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setActionItem(item); setActionType("unpublish") }}>
                      <Eye className="mr-1 h-3 w-3" />{t("buttonUnpublish")}
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={(e) => { e.stopPropagation(); setActionItem(item); setActionType("force_delete") }}>
                    <Trash2 className="mr-1 h-3 w-3" />{t("buttonDelete")}
                  </Button>
                </div>
              ),
            },
          ]}
        />
      )}

      <ConfirmDialog
        open={!!actionItem && !!actionType}
        onOpenChange={(o) => { if (!o) { setActionItem(null); setActionType(null) } }}
        title={actionType === "unpublish" ? t("dialogUnpublishTitle") : t("dialogDeleteTitle")}
        description={actionType === "unpublish" ? t("dialogUnpublishDescription", { title: titlePreview(actionItem?.title || "") }) : t("dialogDeleteDescription", { title: titlePreview(actionItem?.title || "") })}
        confirmLabel={actionType === "unpublish" ? t("buttonUnpublish") : t("buttonDelete")}
        variant={actionType === "force_delete" ? "destructive" : "default"}
        onConfirm={handleAction}
      />
    </AdminPage>
  )
}
