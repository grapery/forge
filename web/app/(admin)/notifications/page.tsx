"use client"

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { useRouter, useSearchParams } from "next/navigation"
import { PageSkeleton } from "@/components/shared/skeleton"

import { notificationApi } from "@/lib/api/admin"

import type { NotificationItem } from "@/lib/types"

import { PageHeader } from "@/components/shared/page-header"

import { DataTable } from "@/components/shared/data-table"

import { SearchInput } from "@/components/shared/search-input"

import { Badge } from "@/components/ui/badge"

import { Button } from "@/components/ui/button"

import { Input } from "@/components/ui/input"

import { Label } from "@/components/ui/label"

import { Textarea } from "@/components/ui/textarea"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"

import { Bell, ExternalLink, Send } from "lucide-react"

import { toast } from "sonner"

const KNOWN_TYPES = [
  "system",
  "promotion",
  "social",
  "content",
  "moderation_report_received",
  "moderation_report_resolved",
  "moderation_block_confirmed",
  "feedback_response",
] as const

function feedbackIdFromLink(link?: string): string | null {
  if (!link) return null
  try {
    const url = new URL(link, "https://forge.local")
    const id = url.searchParams.get("id") || url.searchParams.get("feedbackId")
    if (id) return id
  } catch {
    // fall through
  }
  const match = link.match(/[?&#](?:id|feedbackId)=([^&#]+)/)
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

function adminDeepLink(item: NotificationItem): string | null {
  if (item.type === "feedback_response") {
    const feedbackId = feedbackIdFromLink(item.link)
    if (feedbackId) return `/feedback/detail?id=${feedbackId}`
  }
  return null
}

export default function NotificationsPage() {
  const t = useTranslations("notifications")
  const router = useRouter()
  const searchParams = useSearchParams()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState(() => searchParams.get("userId") || "")
  const [type, setType] = useState(() => searchParams.get("type") || "")
  const pageSize = 20

  const [composeOpen, setComposeOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [composeTitle, setComposeTitle] = useState("")
  const [composeContent, setComposeContent] = useState("")
  const [composeType, setComposeType] = useState("system")
  const [composeLink, setComposeLink] = useState("")
  const [composeUserIds, setComposeUserIds] = useState("")
  const [composeAllActive, setComposeAllActive] = useState(false)
  const [composePlatform, setComposePlatform] = useState("all")

  useEffect(() => {
    const userId = searchParams.get("userId")
    const notificationType = searchParams.get("type")
    const compose = searchParams.get("compose") === "1"
    if (userId) {
      setSearch(userId)
      setComposeUserIds(userId)
    }
    if (notificationType && !compose) setType(notificationType)
    if (compose) {
      setComposeUserIds(userId || searchParams.get("userIds") || "")
      setComposeTitle(searchParams.get("title") || "")
      setComposeContent(searchParams.get("content") || "")
      setComposeLink(searchParams.get("link") || "")
      setComposeType(searchParams.get("type") || "feedback_response")
      setComposeAllActive(false)
      setComposeOpen(true)
      // Drop compose prefill from URL so refresh does not reopen the dialog.
      const clean = new URLSearchParams()
      if (userId) clean.set("userId", userId)
      const qs = clean.toString()
      router.replace(qs ? `/notifications?${qs}` : "/notifications")
    }
    setPage(1)
  }, [searchParams, router])

  const typeLabel = (notificationType: string) => {
    const key = `type_${notificationType}` as Parameters<typeof t>[0]
    if ((KNOWN_TYPES as readonly string[]).includes(notificationType)) {
      return t(key)
    }
    return notificationType
  }

  const fetchData = useCallback(() => {
    setLoading(true)
    setError("")
    notificationApi
      .list({
        page,
        pageSize,
        userId: search || undefined,
        type: type === "" || type === "all" ? undefined : type,
      })
      .then((data) => {
        setItems(data.items || [])
        setTotal(data.total)
      })
      .catch((err: Error) => {
        setItems([])
        setTotal(0)
        setError(err.message || t("loadFailed"))
      })
      .finally(() => setLoading(false))
  }, [page, search, type, t])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const formatTime = (ts: number | null) => {
    if (!ts) return "-"
    return new Date(ts * 1000).toLocaleDateString()
  }

  const resetCompose = () => {
    setComposeTitle("")
    setComposeContent("")
    setComposeType("system")
    setComposeLink("")
    setComposeUserIds(search || "")
    setComposeAllActive(false)
    setComposePlatform("all")
  }

  const handleSend = async () => {
    const title = composeTitle.trim()
    const content = composeContent.trim()
    if (!title || !content) {
      toast.error(t("composeRequired"))
      return
    }
    const userIds = composeUserIds
      .split(/[\s,;]+/)
      .map((id) => id.trim())
      .filter(Boolean)
    if (!composeAllActive && userIds.length === 0) {
      toast.error(t("composeNeedRecipients"))
      return
    }
    setSending(true)
    try {
      const result = await notificationApi.broadcast({
        title,
        content,
        type: composeType,
        link: composeLink.trim() || undefined,
        userIds: composeAllActive ? undefined : userIds,
        allActive: composeAllActive || undefined,
        platform: composeAllActive && composePlatform !== "all" ? composePlatform : undefined,
      })
      toast.success(
        result.failed > 0
          ? t("composeSentWithFailed", { sent: result.sent, total: result.total, failed: result.failed })
          : t("composeSent", { sent: result.sent, total: result.total }),
      )
      setComposeOpen(false)
      resetCompose()
      fetchData()
    } catch (err: any) {
      toast.error(err?.message || t("composeFailed"))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Bell}
        actions={
          <Button onClick={() => { resetCompose(); setComposeOpen(true) }}>
            <Send className="mr-2 h-4 w-4" />
            {t("buttonCompose")}
          </Button>
        }
      />

      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-64">
          <SearchInput value={search} onSearch={setSearch} placeholder={t("searchPlaceholder")} />
        </div>
        <Select value={type || "all"} onValueChange={(v) => { setType(v); setPage(1) }}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder={t("filterAllTypes")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAllTypes")}</SelectItem>
            <SelectItem value="system">{t("filterSystem")}</SelectItem>
            <SelectItem value="promotion">{t("filterPromotion")}</SelectItem>
            <SelectItem value="social">{t("filterSocial")}</SelectItem>
            <SelectItem value="content">{t("filterContent")}</SelectItem>
            <SelectItem value="moderation_report_received">{t("filterModerationReportReceived")}</SelectItem>
            <SelectItem value="moderation_report_resolved">{t("filterModerationReportResolved")}</SelectItem>
            <SelectItem value="moderation_block_confirmed">{t("filterModerationBlockConfirmed")}</SelectItem>
            <SelectItem value="feedback_response">{t("filterFeedbackResponse")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      {loading ? (
        <PageSkeleton />
      ) : (
        <DataTable
          data={items}
          pagination={{ page, pageSize, total }}
          onPageChange={setPage}
          onRowClick={(item: NotificationItem) => {
            const href = adminDeepLink(item)
            if (href) router.push(href)
          }}
          columns={[
            {
              key: "userId",
              header: t("columnUserId"),
              render: (item: NotificationItem) => (
                <button
                  type="button"
                  className="text-xs font-mono text-primary hover:underline"
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/users/detail?id=${item.userId}`)
                  }}
                >
                  {item.userId}
                </button>
              ),
            },
            {
              key: "type",
              header: t("columnType"),
              render: (item: NotificationItem) => (
                <Badge variant="secondary">{typeLabel(item.type)}</Badge>
              ),
            },
            {
              key: "title",
              header: t("columnTitle"),
              render: (item: NotificationItem) => (
                <span className="text-sm font-medium">{item.title}</span>
              ),
            },
            {
              key: "content",
              header: t("columnContent"),
              render: (item: NotificationItem) => (
                <span className="text-xs text-muted-foreground">
                  {item.content.length > 60 ? item.content.substring(0, 60) + "..." : item.content}
                </span>
              ),
            },
            {
              key: "read",
              header: t("columnRead"),
              render: (item: NotificationItem) => (
                <Badge variant={item.read ? "default" : "secondary"}>
                  {item.read ? t("readYes") : t("readNo")}
                </Badge>
              ),
            },
            {
              key: "createdAt",
              header: t("columnCreated"),
              render: (item: NotificationItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(item.createdAt)}</span>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (item: NotificationItem) => {
                const href = adminDeepLink(item)
                if (!href) return null
                return (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(href)
                    }}
                  >
                    <ExternalLink className="mr-1 h-3 w-3" />
                    {t("openRelated")}
                  </Button>
                )
              },
            },
          ]}
        />
      )}

      <Dialog open={composeOpen} onOpenChange={(o) => { if (!o) setComposeOpen(false) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("composeTitle")}</DialogTitle>
            <DialogDescription>{t("composeDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("composeFieldTitle")}</Label>
              <Input value={composeTitle} onChange={(e) => setComposeTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("composeFieldContent")}</Label>
              <Textarea value={composeContent} onChange={(e) => setComposeContent(e.target.value)} rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("composeFieldType")}</Label>
                <Select value={composeType} onValueChange={setComposeType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">{t("filterSystem")}</SelectItem>
                    <SelectItem value="promotion">{t("filterPromotion")}</SelectItem>
                    <SelectItem value="content">{t("filterContent")}</SelectItem>
                    <SelectItem value="feedback_response">{t("filterFeedbackResponse")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("composeFieldLink")}</Label>
                <Input value={composeLink} onChange={(e) => setComposeLink(e.target.value)} placeholder="/settings/feedback" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("composeFieldUserIds")}</Label>
              <Textarea
                value={composeUserIds}
                onChange={(e) => setComposeUserIds(e.target.value)}
                rows={2}
                disabled={composeAllActive}
                placeholder={t("composeUserIdsPlaceholder")}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={composeAllActive}
                onChange={(e) => setComposeAllActive(e.target.checked)}
              />
              {t("composeAllActive")}
            </label>
            {composeAllActive && (
              <div className="space-y-1.5">
                <Label>{t("composeFieldPlatform")}</Label>
                <Select value={composePlatform} onValueChange={setComposePlatform}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("composePlatformAll")}</SelectItem>
                    <SelectItem value="ios">iOS</SelectItem>
                    <SelectItem value="android">Android</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-[var(--status-warning)]">{t("composeAllActiveHint")}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)} disabled={sending}>
              {t("composeCancel")}
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? t("composeSending") : t("composeSend")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
