"use client"

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"

import { useSearchParams } from "next/navigation"

import { topicApi } from "@/lib/api/admin"

import { PageHeader } from "@/components/shared/page-header"

import { DataTable } from "@/components/shared/data-table"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { Button } from "@/components/ui/button"

import { ArrowLeft } from "lucide-react"

import { useRouter } from "next/navigation"


export default function TopicDetailPage() {
  const t = useTranslations("topicsDetail")
  const searchParams = useSearchParams()
  const router = useRouter()
  const topic = searchParams.get("topic") || ""
  const [tab, setTab] = useState("fragments")
  const [items, setItems] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const pageSize = 20

  const fetchData = useCallback(() => {
    if (!topic) return
    setLoading(true)
    const apiCall = tab === "fragments" ? topicApi.fragments : topicApi.stories
    apiCall(topic, { page, pageSize })
      .then((data) => {
        setItems(data.items || [])
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [topic, tab, page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const formatTime = (ts: number) => ts ? new Date(ts * 1000).toLocaleDateString() : "-"

  return (
    <div className="space-y-6">
      <PageHeader
        title={`#${topic}`}
        description={t("description", { topic })}
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />{t("buttonBack")}
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => { setTab(v); setPage(1) }}>
        <TabsList>
          <TabsTrigger value="fragments">{t("tabFragments")}</TabsTrigger>
          <TabsTrigger value="stories">{t("tabStories")}</TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          {loading ? (
            <PageSkeleton />
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">{t("noContentFound")}</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item: any, idx: number) => (
                <div key={item.id || idx} className="rounded-lg border p-4 space-y-2">
                  <h3 className="font-medium text-sm line-clamp-2">{item.title || "Untitled"}</h3>
                  <p className="text-xs text-muted-foreground">
                    {item.creator_id ? `Author: ${item.creator_id.slice(0, 8)}...` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatTime(item.created_at)}</p>
                </div>
              ))}
            </div>
          )}
          {total > pageSize && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t("buttonPrevious")}</Button>
              <span className="text-sm text-muted-foreground">Page {page} of {Math.ceil(total / pageSize)}</span>
              <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage(page + 1)}>{t("buttonNext")}</Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
