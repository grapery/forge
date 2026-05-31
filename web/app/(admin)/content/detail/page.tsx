"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { contentApi } from "@/lib/api/admin"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { ArrowLeft, Eye, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function ContentDetailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = searchParams.get("id")
  const contentType = searchParams.get("type") || "story"
  const [detail, setDetail] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    contentApi.get(contentType, id).then(setDetail).catch(() => toast.error("Content not found")).finally(() => setLoading(false))
  }, [id, contentType])

  const handleAction = async () => {
    if (!id || !action) return
    try {
      await contentApi.action(contentType, id, { action })
      toast.success(`Content ${action === "unpublish" ? "unpublished" : "deleted"}`)
      setAction(null)
      router.back()
    } catch (err: any) {
      toast.error(err.message || "Action failed")
    }
  }

  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading...</div>
  if (!detail) return <div className="py-12 text-center text-muted-foreground">Content not found</div>

  const formatTime = (ts: any) => {
    if (!ts) return "-"
    // Handle both time.Time string format and Unix int64
    if (typeof ts === "string") {
      const d = new Date(ts)
      if (!isNaN(d.getTime())) return d.toLocaleString()
    }
    const num = typeof ts === "number" ? ts : Number(ts)
    if (isNaN(num)) return String(ts)
    // If number is > 1e12 it's likely milliseconds, otherwise seconds
    const ms = num > 1e12 ? num : num * 1000
    return new Date(ms).toLocaleString()
  }

  const typeLabel = contentType === "story" ? "Story" : contentType === "storyboard" ? "Storyboard" : "Fragment"

  // Get author ID based on content type (different column names)
  const authorId = detail.author_id || detail.creator_id || detail.user_id
  const statusField = detail.status || detail.workflow_status || detail.visibility || ""

  const displayFields = [
    { label: "ID", value: detail.id },
    { label: "Type", value: typeLabel },
    { label: "Title", value: detail.title || detail.caption || detail.name },
    { label: "Status", value: statusField },
    { label: "Author ID", value: authorId },
    { label: "Likes", value: detail.likes },
    { label: "Comments", value: detail.comments },
    { label: "Created", value: formatTime(detail.created_at) },
    { label: "Updated", value: formatTime(detail.updated_at) },
  ].filter(f => f.value !== undefined && f.value !== null && f.value !== "")

  return (
    <div className="space-y-6">
      <PageHeader
        title={detail.title || detail.name || `${typeLabel} Detail`}
        description={`${typeLabel} — ${detail.id?.slice(0, 8)}...`}
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />Back
          </Button>
        }
      />

      <Card>
        <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
        <CardContent className="grid gap-3 text-sm">
          {displayFields.map((f) => (
            <div key={f.label} className="flex justify-between py-1 border-b last:border-0">
              <span className="text-muted-foreground">{f.label}</span>
              {f.label === "Status" ? (
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
          <CardHeader><CardTitle>Description</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{String(detail.description)}</p>
          </CardContent>
        </Card>
      )}

      {detail.content && (
        <Card>
          <CardHeader><CardTitle>Content</CardTitle></CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-xs font-mono overflow-auto max-h-96">
              {typeof detail.content === "string" ? detail.content : JSON.stringify(detail.content, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {detail.topic && (
        <Card>
          <CardHeader><CardTitle>Topic</CardTitle></CardHeader>
          <CardContent>
            <Badge variant="outline">#{String(detail.topic)}</Badge>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setAction("unpublish")}>
          <Eye className="mr-2 h-4 w-4" />Unpublish
        </Button>
        <Button variant="destructive" onClick={() => setAction("force_delete")}>
          <Trash2 className="mr-2 h-4 w-4" />Delete
        </Button>
      </div>

      <ConfirmDialog
        open={!!action}
        onOpenChange={(o) => { if (!o) setAction(null) }}
        title={action === "unpublish" ? "Unpublish Content" : "Delete Content"}
        description={`Are you sure you want to ${action === "unpublish" ? "unpublish" : "permanently delete"} this ${typeLabel.toLowerCase()}?`}
        confirmLabel={action === "unpublish" ? "Unpublish" : "Delete"}
        variant={action === "force_delete" ? "destructive" : "default"}
        onConfirm={handleAction}
      />
    </div>
  )
}
