"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"

import { contentApi, aiGenerationApi } from "@/lib/api/admin"

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

import { BookOpen, Eye, Globe, Lock, Users, Trash2 } from "lucide-react"

import { toast } from "sonner"


const visibilityVariant: Record<string, "default" | "secondary" | "outline"> = {
  public: "default",
  private: "secondary",
  followers_only: "outline",
}


export default function FragmentsPage() {
  const router = useRouter()
  const t = useTranslations("fragments")
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
        contentType: "fragment",
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
    contentApi.statusCounts("fragment").then(setCounts).catch(() => {})
  }, [])

  const handleAction = async () => {
    if (!actionItem || !actionType) return
    try {
      await contentApi.action("fragment", actionItem.id, { action: actionType })
      toast.success(actionType === "unpublish" ? t("toastUnpublished") : t("toastDeleted"))
      setActionItem(null)
      setActionType(null)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Action failed")
    }
  }

  const formatTime = (ts: number) => new Date(ts * 1000).toLocaleString()

  const captionPreview = (text: string) => {
    if (!text) return "-"
    return text.length > 60 ? text.slice(0, 60) + "..." : text
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} icon={BookOpen} />

      {counts && (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard title={t("statTotal")} value={counts.total} icon={BookOpen} />
          <StatCard title={t("statPublic")} value={counts.published} icon={Globe} />
          <StatCard title={t("statPrivate")} value={counts.draft + counts.other} icon={Lock} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <div className="w-64">
          <SearchInput onSearch={(v) => { setSearch(v); setPage(1) }} placeholder={t("searchPlaceholder")} />
        </div>

        <Select value={status || "all"} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("filterAllVisibility")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAllVisibility")}</SelectItem>
            <SelectItem value="public">{t("filterPublic")}</SelectItem>
            <SelectItem value="private">{t("filterPrivate")}</SelectItem>
            <SelectItem value="followers_only">{t("filterFollowersOnly")}</SelectItem>
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
          onRowClick={(item) => router.push(`/fragments/detail?id=${item.id}`)}
          columns={[
            {
              key: "caption",
              header: t("columnCaption"),
              render: (item: ContentItem) => (
                <span className="text-sm font-medium" title={item.title}>{captionPreview(item.title)}</span>
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
              key: "visibility",
              header: t("columnVisibility"),
              render: (item: ContentItem) => (
                <Badge variant={visibilityVariant[item.status] || "secondary"}>{item.status}</Badge>
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
                  {item.status === "public" && (
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
        description={actionType === "unpublish" ? t("dialogUnpublishDescription", { caption: captionPreview(actionItem?.title || "") }) : t("dialogDeleteDescription", { caption: captionPreview(actionItem?.title || "") })}
        confirmLabel={actionType === "unpublish" ? t("buttonUnpublish") : t("buttonDelete")}
        variant={actionType === "force_delete" ? "destructive" : "default"}
        onConfirm={handleAction}
      />
    </div>
  )
}
