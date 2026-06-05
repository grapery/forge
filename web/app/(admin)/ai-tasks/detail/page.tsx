"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"
import { PageSkeleton } from "@/components/shared/skeleton"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { aiTaskApi } from "@/lib/api/admin"

export default function AITaskDetailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = searchParams.get("id")
  const [detail, setDetail] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    aiTaskApi
      .get(id)
      .then(setDetail)
      .catch(() => toast.error("Failed to load task"))
      .finally(() => setLoading(false))
  }, [id])

  const handleCancel = async () => {
    if (!id) return
    setCancelling(true)
    try {
      await aiTaskApi.cancel(id)
      toast.success("Task cancelled")
      setShowCancelDialog(false)
      // Refresh detail
      const updated = await aiTaskApi.get(id)
      setDetail(updated)
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel task")
    } finally {
      setCancelling(false)
    }
  }

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

  if (loading) return <PageSkeleton />
  if (!detail) return <div className="py-12 text-center text-muted-foreground">Not found</div>

  const status = detail.status || ""
  const canCancel = status === "pending" || status === "running"

  const statusVariant = (() => {
    switch (status) {
      case "completed":
        return "default"
      case "failed":
        return "destructive"
      case "running":
        return "secondary"
      default:
        return "outline"
    }
  })()

  const displayFields = [
    { label: "ID", value: detail.id },
    { label: "Type", value: detail.type },
    { label: "Status", value: status, isStatus: true },
    { label: "Provider", value: detail.provider },
    { label: "Model", value: detail.model },
    { label: "User ID", value: detail.user_id },
    { label: "Tokens Used", value: detail.tokens_used },
    { label: "Progress", value: detail.progress },
    { label: "Related Entity Type", value: detail.related_entity_type },
    { label: "Related Entity ID", value: detail.related_entity_id },
    { label: "Error Message", value: detail.error_message },
    { label: "Created At", value: formatTime(detail.created_at) },
    { label: "Started At", value: formatTime(detail.started_at) },
    { label: "Completed At", value: formatTime(detail.completed_at) },
  ].filter((f) => f.value !== undefined && f.value !== null && f.value !== "")

  return (
    <div className="space-y-6">
      <PageHeader
        title={`AI Task — ${detail.id?.slice(0, 8) || "Detail"}...`}
        description={detail.type || ""}
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          {displayFields.map((f) => (
            <div key={f.label} className="flex justify-between py-1 border-b last:border-0">
              <span className="text-muted-foreground">{f.label}</span>
              {f.isStatus ? (
                <Badge variant={statusVariant}>{String(f.value)}</Badge>
              ) : (
                <span className="text-right max-w-[60%] truncate">{String(f.value)}</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {detail.input && (
        <Card>
          <CardHeader>
            <CardTitle>Input</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-xs font-mono overflow-auto max-h-96">
              {typeof detail.input === "string" ? detail.input : JSON.stringify(detail.input, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {detail.output && (
        <Card>
          <CardHeader>
            <CardTitle>Output</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-xs font-mono overflow-auto max-h-96">
              {typeof detail.output === "string" ? detail.output : JSON.stringify(detail.output, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {detail.error_message && status === "failed" && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive whitespace-pre-wrap">{String(detail.error_message)}</p>
          </CardContent>
        </Card>
      )}

      {canCancel && (
        <div className="flex gap-2">
          <Button variant="destructive" onClick={() => setShowCancelDialog(true)}>
            Cancel Task
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        title="Cancel Task"
        description="Are you sure you want to cancel this task? This action cannot be undone."
        confirmLabel="Cancel Task"
        variant="destructive"
        onConfirm={handleCancel}
        loading={cancelling}
      />
    </div>
  )
}
