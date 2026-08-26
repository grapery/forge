"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"

import { contentApi, aiGenerationApi } from "@/lib/api/admin"

import type { AIGenerationRecordItem } from "@/lib/types"

import { PageHeader } from "@/components/shared/page-header"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { Badge } from "@/components/ui/badge"

import { Button } from "@/components/ui/button"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"

import { ArrowLeft, Eye, Trash2, Sparkles, Layers, GitBranch, CircleDot } from "lucide-react"

import { toast } from "sonner"


export default function StoryboardDetailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const t = useTranslations("storyboardDetail")
  const tStoryboards = useTranslations("storyboards")
  const id = searchParams.get("id")
  const [detail, setDetail] = useState<Record<string, any> | null>(null)
  const [generations, setGenerations] = useState<AIGenerationRecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState<string | null>(null)

  const loadDetail = useCallback(() => {
    if (!id) return
    setLoading(true)
    contentApi.get("storyboard", id)
      .then(setDetail)
      .catch(() => toast.error(t("toastNotFound")))
      .finally(() => setLoading(false))
  }, [id, t])

  const loadGenerations = useCallback(() => {
    if (!id) return
    aiGenerationApi.list({ relatedEntityType: "storyboard", pageSize: 100 })
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
      await contentApi.action("storyboard", id, { action })
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

  const title = detail.title || detail.name || "-"
  const statusField = detail.status || detail.workflow_status || ""
  const authorId = detail.author_id || detail.creator_id || detail.user_id
  const canUnpublish = statusField === "published"
  const parentId = String(detail.parent_id || "").trim()
  const isContinuation = parentId !== "" && parentId !== "__root__"

  const displayFields = [
    { label: t("fieldId"), value: detail.id },
    { label: t("fieldStatus"), value: statusField, isStatus: true },
    { label: t("fieldAuthorId"), value: authorId },
    { label: t("fieldLikes"), value: detail.likes },
    { label: t("fieldComments"), value: detail.comments },
    { label: t("fieldCreated"), value: formatTime(detail.created_at) },
    { label: t("fieldUpdated"), value: formatTime(detail.updated_at) },
  ].filter((f) => f.value !== undefined && f.value !== null && f.value !== "")

  return (
    <div className="space-y-6">
      <PageHeader
        title={title.length > 60 ? title.slice(0, 60) + "..." : title}
        description={`${tStoryboards("title")} — ${(detail.id || "").slice(0, 8)}...`}
        icon={Layers}
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />{t("buttonBack")}
          </Button>
        }
      />

      <Card>
        <CardHeader><CardTitle>{t("cardTitle")}</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap font-medium">{title}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("cardLineage")}</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            {isContinuation ? <GitBranch className="h-4 w-4 text-muted-foreground" /> : <CircleDot className="h-4 w-4 text-muted-foreground" />}
            <span className="font-medium">{isContinuation ? t("continuationNode") : t("rootNode")}</span>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div><p className="text-xs text-muted-foreground">{t("fieldStoryId")}</p><p className="mt-1 break-all font-mono text-xs">{detail.story_id || "-"}</p></div>
            {isContinuation && (
              <div><p className="text-xs text-muted-foreground">{t("fieldParent")}</p><Link className="mt-1 block break-all font-mono text-xs text-primary hover:underline" href={`/storyboards/detail?id=${encodeURIComponent(parentId)}`}>{parentId}</Link></div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{t("lineageHelp")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("cardOverview")}</CardTitle></CardHeader>
        <CardContent className="grid gap-3 text-sm">
          {displayFields.map((f) => (
            <div key={f.label} className="flex justify-between py-1 border-b last:border-0">
              <span className="text-muted-foreground">{f.label}</span>
              {f.isStatus ? (
                <Badge variant={f.value === "published" ? "default" : "secondary"}>{String(f.value)}</Badge>
              ) : (
                <span className="text-right max-w-[60%] truncate">{String(f.value)}</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {detail.description && (
        <Card>
          <CardHeader><CardTitle>{t("cardDescription")}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{String(detail.description)}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
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
                <div key={g.id} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-secondary/30 transition-colors">
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
