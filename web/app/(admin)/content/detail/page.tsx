"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"

import { useSearchParams } from "next/navigation"

import { contentApi } from "@/lib/api/admin"

import { PageHeader } from "@/components/shared/page-header"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { Badge } from "@/components/ui/badge"

import { Button } from "@/components/ui/button"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"

import { ArrowLeft, Eye, Trash2, RotateCcw, Upload } from "lucide-react"

import { useRouter } from "next/navigation"

import { toast } from "sonner"
import { AdminPage } from "@/components/layout/admin-page"


export default function ContentDetailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const t = useTranslations("contentDetail")
  const id = searchParams.get("id")
  const contentType = searchParams.get("type") || "story"
  const [detail, setDetail] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    contentApi.get(contentType, id).then(setDetail).catch(() => toast.error(t("toastNotFound"))).finally(() => setLoading(false))
  }, [id, contentType])

  const handleAction = async () => {
    if (!id || !action) return
    try {
      await contentApi.action(contentType, id, { action })
      toast.success(t(action === "unpublish" ? "toastUnpublished" : action === "publish" ? "toastPublished" : action === "restore" ? "toastRestored" : "toastDeleted"))
      setAction(null)
      router.back()
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

  const typeLabel = contentType === "story" ? "Story" : contentType === "storyboard" ? "Storyboard" : "Fragment"

  const authorId = detail.author_id || detail.creator_id || detail.user_id
  const statusField = detail.status || detail.workflow_status || detail.visibility || ""
  const isRemoved = Boolean(detail.deleted_at && detail.deleted_at !== "0")
  const isPublished = statusField === "published" || statusField === "public"

  const displayFields = [
    { label: t("fieldId"), value: detail.id },
    { label: t("fieldType"), value: typeLabel },
    { label: t("fieldTitle"), value: detail.title || detail.caption || detail.name },
    { label: t("fieldStatus"), value: statusField },
    { label: t("fieldAuthorId"), value: authorId },
    { label: t("fieldLikes"), value: detail.likes },
    { label: t("fieldComments"), value: detail.comments },
    { label: t("fieldCreated"), value: formatTime(detail.created_at) },
    { label: t("fieldUpdated"), value: formatTime(detail.updated_at) },
  ].filter(f => f.value !== undefined && f.value !== null && f.value !== "")

  return (
    <AdminPage>
      <PageHeader
        title={detail.title || detail.name || t("detailTitle", { typeLabel })}
        description={`${typeLabel} — ${detail.id?.slice(0, 8)}...`}
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />{t("buttonBack")}
          </Button>
        }
      />

      <Card>
        <CardHeader><CardTitle>{t("cardOverview")}</CardTitle></CardHeader>
        <CardContent className="grid gap-3 text-sm">
          {displayFields.map((f) => (
            <div key={f.label} className="flex justify-between py-1 border-b last:border-0">
              <span className="text-muted-foreground">{f.label}</span>
              {f.label === t("fieldStatus") ? (
                <Badge variant={f.value === "active" || f.value === "published" ? "default" : "secondary"}>{String(f.value)}</Badge>
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

      {detail.content && (
        <Card>
          <CardHeader><CardTitle>{t("cardContent")}</CardTitle></CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-xs font-mono overflow-auto max-h-96">
              {typeof detail.content === "string" ? detail.content : JSON.stringify(detail.content, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {detail.topic && (
        <Card>
          <CardHeader><CardTitle>{t("cardTopic")}</CardTitle></CardHeader>
          <CardContent>
            <Badge variant="outline">#{String(detail.topic)}</Badge>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        {isRemoved ? (
          <Button variant="outline" onClick={() => setAction("restore")}><RotateCcw className="mr-2 h-4 w-4" />{t("buttonRestore")}</Button>
        ) : <>
          {isPublished ? (
            <Button variant="outline" onClick={() => setAction("unpublish")}><Eye className="mr-2 h-4 w-4" />{t("buttonUnpublish")}</Button>
          ) : (
            <Button variant="outline" onClick={() => setAction("publish")}><Upload className="mr-2 h-4 w-4" />{t("buttonPublish")}</Button>
          )}
          <Button variant="destructive" onClick={() => setAction("force_delete")}><Trash2 className="mr-2 h-4 w-4" />{t("buttonDelete")}</Button>
        </>}
      </div>

      <ConfirmDialog
        open={!!action}
        onOpenChange={(o) => { if (!o) setAction(null) }}
        title={action === "unpublish" ? t("dialogUnpublishTitle") : action === "publish" ? t("dialogPublishTitle") : action === "restore" ? t("dialogRestoreTitle") : t("dialogDeleteTitle")}
        description={action === "unpublish" ? t("dialogUnpublishDescription", { type: typeLabel.toLowerCase() }) : action === "publish" ? t("dialogPublishDescription", { type: typeLabel.toLowerCase() }) : action === "restore" ? t("dialogRestoreDescription", { type: typeLabel.toLowerCase() }) : t("dialogDeleteDescription", { type: typeLabel.toLowerCase() })}
        confirmLabel={action === "unpublish" ? t("dialogConfirmUnpublish") : action === "publish" ? t("buttonPublish") : action === "restore" ? t("buttonRestore") : t("buttonDelete")}
        variant={action === "force_delete" ? "destructive" : "default"}
        onConfirm={handleAction}
      />
    </AdminPage>
  )
}
