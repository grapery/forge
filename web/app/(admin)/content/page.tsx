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

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { Input } from "@/components/ui/input"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"

import { Eye, Trash2, FileText, Sparkles, ArrowRight, RotateCcw, Upload, Flag } from "lucide-react"

import { useRouter } from "next/navigation"

import { toast } from "sonner"
import { AdminPage } from "@/components/layout/admin-page"
import { Textarea } from "@/components/ui/textarea"


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

const statusOptionsByTab: Record<string, { value: string; labelKey: string }[]> = {
  story: [
    { value: "published", labelKey: "filterPublished" },
    { value: "draft", labelKey: "filterDraft" },
  ],
  storyboard: [
    { value: "published", labelKey: "filterPublished" },
    { value: "draft", labelKey: "filterDraft" },
  ],
  fragment: [
    { value: "public", labelKey: "filterPublic" },
    { value: "private", labelKey: "filterPrivate" },
    { value: "followers_only", labelKey: "filterFollowersOnly" },
  ],
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
  const [status, setStatus] = useState("")
  const [authorId, setAuthorId] = useState("")
  const [lifecycle, setLifecycle] = useState<"active" | "removed" | "all">("active")
  const [reportState, setReportState] = useState<"" | "reported" | "pending_reports" | "unreported">("")
  const [reason, setReason] = useState("")
  const pageSize = 20

  const [actionItem, setActionItem] = useState<ContentItem | null>(null)
  const [actionType, setActionType] = useState<string | null>(null)

  const fetchData = useCallback(() => {
    setLoading(true)
    contentApi
      .list({
        page,
        pageSize,
        contentType: tab,
        search: search || undefined,
        status: status || undefined,
        authorId: authorId || undefined,
        lifecycle,
        reportState: reportState || undefined,
      })
      .then((data) => {
        setItems(data.items || [])
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, tab, search, status, authorId, lifecycle, reportState])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    contentApi.statusCounts(tab).then(setCounts).catch(() => {})
  }, [tab])

  const handleTabChange = (v: string) => {
    setTab(v)
    setStatus("")
    setLifecycle("active")
    setReportState("")
    setPage(1)
  }

  const handleAction = async () => {
    if (!actionItem || !actionType) return
    try {
      await contentApi.action(actionItem.contentType || tab, actionItem.id, { action: actionType, reason: reason.trim() || undefined })
      toast.success(t(actionType === "unpublish" ? "toastUnpublished" : actionType === "publish" ? "toastPublished" : actionType === "restore" ? "toastRestored" : "toastDeleted"))
      setActionItem(null)
      setActionType(null)
      setReason("")
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Action failed")
    }
  }

  const formatTime = (ts: number) => new Date(ts * 1000).toLocaleDateString()

  const isPublished = (item: ContentItem) => item.status === publishedStatuses[tab] || item.status === "published" || item.status === "public"

  const actionLabel = (action: string | null) => {
    if (action === "unpublish") return t("buttonUnpublish")
    if (action === "publish") return t("buttonPublish")
    if (action === "restore") return t("buttonRestore")
    return t("buttonDelete")
  }

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
      key: "reports",
      header: t("columnReports"),
      render: (item: ContentItem) => item.reportCount ? (
        <Button variant="ghost" size="sm" className={item.pendingReportCount ? "text-destructive" : "text-muted-foreground"} onClick={(e) => {
          e.stopPropagation()
          router.push(`/reports?tab=content&contentType=${item.contentType}&keyword=${encodeURIComponent(item.id)}${item.pendingReportCount ? "&status=pending" : ""}`)
        }}>
          <Flag className="mr-1 h-3 w-3" />{item.pendingReportCount ? t("pendingReports", { count: item.pendingReportCount }) : t("reportCount", { count: item.reportCount })}
        </Button>
      ) : <span className="text-xs text-muted-foreground">—</span>,
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
          {item.isRemoved ? (
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setActionItem(item); setActionType("restore") }}>
              <RotateCcw className="mr-1 h-3 w-3" />{t("buttonRestore")}
            </Button>
          ) : isPublished(item) ? (
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setActionItem(item); setActionType("unpublish") }}>
              <Eye className="mr-1 h-3 w-3" />{t("buttonUnpublish")}
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setActionItem(item); setActionType("publish") }}>
              <Upload className="mr-1 h-3 w-3" />{t("buttonPublish")}
            </Button>
          )}
          {!item.isRemoved && <Button variant="ghost" size="sm" className="text-destructive" onClick={(e) => { e.stopPropagation(); setActionItem(item); setActionType("force_delete") }}>
              <Trash2 className="mr-1 h-3 w-3" />{t("buttonDelete")}
            </Button>}
        </div>
      ),
    },
  ]

  return (
    <AdminPage>
      <PageHeader title={t("title")} description={t("description")} icon={FileText} />

      {counts && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{t("filterTotal")}: <strong>{counts.total}</strong></span>
          <span>{t("filterPublished")}: <strong>{counts.published}</strong></span>
          <span>{t("filterDraft")}: <strong>{counts.draft}</strong></span>
          <span>{t("statRemoved")}: <strong>{counts.removed || 0}</strong></span>
          <span className={counts.pendingReports ? "text-destructive" : ""}>{t("statPendingReports")}: <strong>{counts.pendingReports || 0}</strong></span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <div className="w-64">
          <SearchInput onSearch={(v) => { setSearch(v); setPage(1) }} placeholder={t("searchPlaceholder")} />
        </div>

        <Select value={status || "all"} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1) }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder={t("filterAllStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAllStatus")}</SelectItem>
            {(statusOptionsByTab[tab] || []).map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={lifecycle} onValueChange={(v: "active" | "removed" | "all") => { setLifecycle(v); setPage(1) }}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">{t("filterActive")}</SelectItem>
            <SelectItem value="removed">{t("filterRemoved")}</SelectItem>
            <SelectItem value="all">{t("filterAllLifecycle")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={reportState || "all"} onValueChange={(v) => { setReportState(v === "all" ? "" : v as typeof reportState); setPage(1) }}>
          <SelectTrigger className="w-36"><SelectValue placeholder={t("filterAllReports")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAllReports")}</SelectItem>
            <SelectItem value="pending_reports">{t("filterPendingReports")}</SelectItem>
            <SelectItem value="reported">{t("filterReported")}</SelectItem>
            <SelectItem value="unreported">{t("filterUnreported")}</SelectItem>
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

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="story">{t("tabStories")}</TabsTrigger>
          <TabsTrigger value="storyboard">{t("tabStoryboards")}</TabsTrigger>
          <TabsTrigger value="fragment">{t("tabFragments")}</TabsTrigger>
        </TabsList>

        {(tab === "storyboard" || tab === "fragment") && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
            <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">{t("dedicatedPageHint")}</span>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs text-primary"
              onClick={() => router.push(tab === "storyboard" ? "/storyboards" : "/fragments")}
            >
              {tab === "storyboard" ? t("openStoryboardPage") : t("openFragmentPage")}
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        )}

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
        title={actionType === "unpublish" ? t("dialogUnpublishTitle") : actionType === "publish" ? t("dialogPublishTitle") : actionType === "restore" ? t("dialogRestoreTitle") : t("dialogDeleteTitle")}
        description={actionType === "unpublish" ? t("dialogUnpublishDescription", { title: actionItem?.title || "this content" }) : actionType === "publish" ? t("dialogPublishDescription", { title: actionItem?.title || "this content" }) : actionType === "restore" ? t("dialogRestoreDescription", { title: actionItem?.title || "this content" }) : t("dialogDeleteDescription", { title: actionItem?.title || "this content" })}
        confirmLabel={actionLabel(actionType)}
        variant={actionType === "force_delete" ? "destructive" : "default"}
        onConfirm={handleAction}
      >
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("reasonPlaceholder")} />
      </ConfirmDialog>
    </AdminPage>
  )
}
