"use client"

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { PageSkeleton } from "@/components/shared/skeleton"

import { notificationApi } from "@/lib/api/admin"

import type { NotificationItem } from "@/lib/types"

import { PageHeader } from "@/components/shared/page-header"

import { DataTable } from "@/components/shared/data-table"

import { SearchInput } from "@/components/shared/search-input"

import { Badge } from "@/components/ui/badge"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { Bell } from "lucide-react"

const KNOWN_TYPES = [
  "system",
  "promotion",
  "social",
  "content",
  "moderation_report_received",
  "moderation_report_resolved",
  "moderation_block_confirmed",
] as const

export default function NotificationsPage() {
  const t = useTranslations("notifications")
  const searchParams = useSearchParams()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState(() => searchParams.get("userId") || "")
  const [type, setType] = useState(() => searchParams.get("type") || "")
  const pageSize = 20

  useEffect(() => {
    const userId = searchParams.get("userId")
    const notificationType = searchParams.get("type")
    if (userId) setSearch(userId)
    if (notificationType) setType(notificationType)
    setPage(1)
  }, [searchParams])

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

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} icon={Bell} />

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
          columns={[
            {
              key: "userId",
              header: t("columnUserId"),
              render: (item: NotificationItem) => (
                <span className="text-xs font-mono text-muted-foreground">{item.userId}</span>
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
          ]}
        />
      )}
    </div>
  )
}
