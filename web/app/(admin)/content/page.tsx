"use client"

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"

import { contentApi } from "@/lib/api/admin"

import type { ContentItem, ContentStatusCount } from "@/lib/types"

import { PageHeader } from "@/components/shared/page-header"

import { DataTable } from "@/components/shared/data-table"

import { SearchInput } from "@/components/shared/search-input"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { Badge } from "@/components/ui/badge"

import { Button } from "@/components/ui/button"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"

import { Eye, Trash2, FileText } from "lucide-react"

import { useRouter } from "next/navigation"

import { toast } from "sonner"


const publishedStatuses: Record<string, string> = {
  story: "published",
  storyboard: "published",
  fragment: "public",
}

const statusBadgeMap: Record<string, "default" | "secondary" | "outline"> = {
  published: "default",
  public: "default",
  draft: "secondary",
  private: "secondary",
  followers_only: "outline",
}

export default function ContentPage() {
  const router = useRouter()
  const t = useTranslations("content")
  const [tab, setTab] = useState("story")
  const [items, setItems] = useState<ContentItem[]>([])
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState<ContentStatusCount | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const pageSize = 20

  const [actionItem, setActionItem] = useState<ContentItem | null>(null)
  const [actionType, setActionType] = useState<string | null>(null)

  const fetchData = useCallback(() => {
    setLoading(true)
    contentApi
      .list({ page, pageSize, contentType: tab, search: search || undefined })
      .then((data) => {
        setItems(data.items || [])
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, tab, search])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    contentApi.statusCounts(tab).then(setCounts).catch(() => {})
  }, [tab])

  const handleAction = async () => {
    if (!actionItem || !actionType) return
    try {
      await contentApi.action(actionItem.contentType || tab, actionItem.id, { action: actionType })
      toast.success(actionType === "unpublish" ? t("toastUnpublished") : t("toastDeleted"))
      setActionItem(null)
      setActionType(null)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Action failed")
    }
  }

  const formatTime = (ts: number) => new Date(ts * 1000).toLocaleDateString()

  const isPublished = (item: ContentItem) => item.status === publishedStatuses[tab] || item.status === "published" || item.status === "public"

  const columns = [
    {
      key: "title",
      header: t("columnTitle"),
      render: (item: ContentItem) => <span className="font-medium">{item.title || "Untitled"}</span>,
    },
    {
      key: "author",
      header: t("columnAuthor"),
      render: (item: ContentItem) => <span className="text-sm text-muted-foreground">{item.authorName || item.authorId}</span>,
    },
    {
      key: "status",
      header: t("columnStatus"),
      render: (item: ContentItem) => <Badge variant={statusBadgeMap[item.status] || "secondary"}>{item.status}</Badge>,
    },
    {
      key: "stats",
      header: t("columnEngagement"),
      render: (item: ContentItem) => <span className="text-xs text-muted-foreground">{t("likesComments", { likes: item.likes, comments: item.comments })}</span>,
    },
    {
      key: "created",
      header: t("columnCreated"),
      render: (item: ContentItem) => <span className="text-xs text-muted-foreground">{formatTime(item.createdAt)}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (item: ContentItem) => (
        <div className="flex gap-1">
          {isPublished(item) && (
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
  ]

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} icon={FileText} />

      {counts && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{t("filterTotal")}: <strong>{counts.total}</strong></span>
          <span>{t("filterPublished")}: <strong>{counts.published}</strong></span>
          <span>{t("filterDraft")}: <strong>{counts.draft}</strong></span>
        </div>
      )}

      <div className="w-64">
        <SearchInput onSearch={setSearch} placeholder={t("searchPlaceholder")} />
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v); setPage(1) }}>
        <TabsList>
          <TabsTrigger value="story">{t("tabStories")}</TabsTrigger>
          <TabsTrigger value="storyboard">{t("tabStoryboards")}</TabsTrigger>
          <TabsTrigger value="fragment">{t("tabFragments")}</TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          {loading ? (
            <PageSkeleton />
          ) : (
            <DataTable
              data={items}
              pagination={{ page, pageSize, total }}
              onPageChange={setPage}
              onRowClick={(item) => router.push(`/content/detail?id=${item.id}&type=${tab}`)}
              columns={columns}
            />
          )}
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!actionItem && !!actionType}
        onOpenChange={(o) => { if (!o) { setActionItem(null); setActionType(null) } }}
        title={actionType === "unpublish" ? t("dialogUnpublishTitle") : t("dialogDeleteTitle")}
        description={actionType === "unpublish" ? t("dialogUnpublishDescription", { title: actionItem?.title || "this content" }) : t("dialogDeleteDescription", { title: actionItem?.title || "this content" })}
        confirmLabel={actionType === "unpublish" ? t("dialogConfirmUnpublish") : t("buttonDelete")}
        variant={actionType === "force_delete" ? "destructive" : "default"}
        onConfirm={handleAction}
      />
    </div>
  )
}
