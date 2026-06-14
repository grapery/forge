"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"

import { contentApi, aiGenerationApi } from "@/lib/api/admin"

import type { AIGenerationRecordItem } from "@/lib/types"

import { PageHeader } from "@/components/shared/page-header"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { Badge } from "@/components/ui/badge"

import { Button } from "@/components/ui/button"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"

import { ArrowLeft, Eye, Trash2, Sparkles, BookOpen } from "lucide-react"

import { toast } from "sonner"


export default function FragmentDetailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const t = useTranslations("fragmentDetail")
  const tFragments = useTranslations("fragments")
  const id = searchParams.get("id")
  const [detail, setDetail] = useState<Record<string, any> | null>(null)
  const [generations, setGenerations] = useState<AIGenerationRecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState<string | null>(null)

  const loadDetail = useCallback(() => {
    if (!id) return
    setLoading(true)
    contentApi.get("fragment", id)
      .then(setDetail)
      .catch(() => toast.error(t("toastNotFound")))
      .finally(() => setLoading(false))
  }, [id, t])

  const loadGenerations = useCallback(() => {
    if (!id) return
    aiGenerationApi.list({ relatedEntityType: "fragment", pageSize: 100 })
      .then((data) => {
        const filtered = (data.items || []).filter((g) => g.relatedEntityId === id)
        setGenerations(filtered)
      })
      .catch(() => {})
  }, [id])

  useEffect(() => { loadDetail() }, [loadDetail])
  useEffect(() => { loadGenerations() }, [loadGenerations])

  const handleAction = async () => {
    if (!id || !action) return
    try {
      await contentApi.action("fragment", id, { action })
      toast.success(action === "unpublish" ? t("toastUnpublished") : t("toastDeleted"))
      setAction(null)
      if (action === "force_delete") {
        router.back()
      } else {
        loadDetail()
      }
    } catch (err: any) {
      toast.error(err.message || "Action failed")
    }
  }

  if (loading) return <PageSkeleton />
  if (!detail) return <div className="py-12 text-center text-muted-foreground">{t("notFound")}</div>

  const formatTime = (ts: any) => {
    if (!ts) return "-"
    if (typeof ts === "string") {
      const d = new Date(ts)
      if (!isNaN(d.getTime())) return d.toLocaleString()
    }
    const num = typeof ts === "number" ? ts : Number(ts)
    if (isNaN(num)) return String(ts)
    const ms = num > 1e12 ? num : num * 1000
    return new Date(ms).toLocaleString()
  }

  const caption = detail.caption || detail.title || detail.name || "-"
  const visibility = detail.visibility || detail.status || ""
  const authorId = detail.author_id || detail.creator_id || detail.user_id
  const canUnpublish = visibility === "public"

  const displayFields = [
    { label: t("fieldId"), value: detail.id },
    { label: t("fieldVisibility"), value: visibility, isStatus: true },
    { label: t("fieldAuthorId"), value: authorId },
    { label: t("fieldTopic"), value: detail.topic },
    { label: t("fieldLikes"), value: detail.likes },
    { label: t("fieldComments"), value: detail.comments },
    { label: t("fieldCreated"), value: formatTime(detail.created_at) },
    { label: t("fieldUpdated"), value: formatTime(detail.updated_at) },
  ].filter((f) => f.value !== undefined && f.value !== null && f.value !== "")

  return (
    <div className="space-y-6">
      <PageHeader
        title={caption.length > 60 ? caption.slice(0, 60) + "..." : caption}
        description={`${tFragments("title")} — ${(detail.id || "").slice(0, 8)}...`}
        icon={BookOpen}
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />{t("buttonBack")}
          </Button>
        }
      />

      <Card>
        <CardHeader><CardTitle>{t("cardCaption")}</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{caption}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("cardOverview")}</CardTitle></CardHeader>
        <CardContent className="grid gap-3 text-sm">
          {displayFields.map((f) => (
            <div key={f.label} className="flex justify-between py-1 border-b last:border-0">
              <span className="text-muted-foreground">{f.label}</span>
              {f.isStatus ? (
                <Badge variant={f.value === "public" ? "default" : "secondary"}>{String(f.value)}</Badge>
              ) : (
                <span className="text-right max-w-[60%] truncate">{String(f.value)}</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {detail.topic && (
        <Card>
          <CardHeader><CardTitle>{t("cardTopic")}</CardTitle></CardHeader>
          <CardContent>
            <Badge variant="outline">#{String(detail.topic)}</Badge>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {t("cardAIGenerations")}
            <Badge variant="secondary">{generations.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {generations.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noAIGenerations")}</p>
          ) : (
            <div className="space-y-2">
              {generations.map((g) => (
                <div key={g.id} className="flex items-center justify-between rounded-lg border border-glass-border p-3 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <Badge variant={g.status === "completed" ? "default" : g.status === "failed" ? "destructive" : "outline"}>{g.status}</Badge>
                    <div>
                      <p className="text-sm font-medium">{g.type}</p>
                      <p className="text-xs text-muted-foreground">{g.provider} / {g.model}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{t("fieldTokens")}: {g.totalTokens}</p>
                    <p className="text-xs text-muted-foreground">{formatTime(g.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        {canUnpublish && (
          <Button variant="outline" onClick={() => setAction("unpublish")}>
            <Eye className="mr-2 h-4 w-4" />{t("buttonUnpublish")}
          </Button>
        )}
        <Button variant="destructive" onClick={() => setAction("force_delete")}>
          <Trash2 className="mr-2 h-4 w-4" />{t("buttonDelete")}
        </Button>
      </div>

      <ConfirmDialog
        open={!!action}
        onOpenChange={(o) => { if (!o) setAction(null) }}
        title={action === "unpublish" ? t("dialogUnpublishTitle") : t("dialogDeleteTitle")}
        description={action === "unpublish" ? t("dialogUnpublishDescription") : t("dialogDeleteDescription")}
        confirmLabel={action === "unpublish" ? t("buttonUnpublish") : t("buttonDelete")}
        variant={action === "force_delete" ? "destructive" : "default"}
        onConfirm={handleAction}
      />
    </div>
  )
}
