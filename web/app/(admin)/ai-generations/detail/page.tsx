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
import { aiGenerationApi } from "@/lib/api/admin"

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  running: "default",
  completed: "secondary",
  failed: "destructive",
}

export default function AIGenerationDetailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = searchParams.get("id") || ""

  const [detail, setDetail] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) {
      router.push("/ai-generations")
      return
    }
    setLoading(true)
    aiGenerationApi
      .get(id)
      .then(setDetail)
      .catch(() => toast.error("Failed to load generation record"))
      .finally(() => setLoading(false))
  }, [id, router])

  if (loading) return <PageSkeleton />
  if (!detail) return <div className="py-12 text-center text-muted-foreground">Not found</div>

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

  const overviewFields = [
    { label: "ID", value: detail.id },
    { label: "Type", value: detail.type },
    { label: "Status", value: detail.status, isStatus: true },
    { label: "Provider", value: detail.provider },
    { label: "Model", value: detail.model },
    { label: "User ID", value: detail.userId || detail.user_id },
    { label: "Input Tokens", value: detail.inputTokens ?? detail.input_tokens },
    { label: "Output Tokens", value: detail.outputTokens ?? detail.output_tokens },
    { label: "Total Tokens", value: detail.totalTokens ?? detail.total_tokens },
    { label: "Image Count", value: detail.imageCount ?? detail.image_count },
    { label: "Video Count", value: detail.videoCount ?? detail.video_count },
    { label: "Duration (ms)", value: detail.durationMs ?? detail.duration_ms },
    { label: "Related Entity Type", value: detail.relatedEntityType ?? detail.related_entity_type },
    { label: "Related Entity ID", value: detail.relatedEntityId ?? detail.related_entity_id },
    { label: "Created At", value: formatTime(detail.createdAt ?? detail.created_at) },
    { label: "Started At", value: formatTime(detail.startedAt ?? detail.started_at) },
    { label: "Completed At", value: formatTime(detail.completedAt ?? detail.completed_at) },
  ].filter((f) => f.value !== undefined && f.value !== null && f.value !== "")

  const originalPrompt = detail.original_prompt ?? detail.originalPrompt
  const enhancedPrompt = detail.enhanced_prompt ?? detail.enhancedPrompt
  const systemPrompt = detail.system_prompt ?? detail.systemPrompt
  const outputResult = detail.output_result ?? detail.outputResult
  const errorMessage = detail.error_message ?? detail.errorMessage

  return (
    <div className="space-y-6">
      <PageHeader
        title={`AI Generation — ${String(detail.id || "").slice(0, 8)}...`}
        description={detail.type || ""}
        actions={
          <Button variant="outline" onClick={() => router.push("/ai-generations")}>
            <ArrowLeft className="mr-2 h-4 w-4" />Back
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          {overviewFields.map((f) => (
            <div key={f.label} className="flex justify-between py-1 border-b last:border-0">
              <span className="text-muted-foreground">{f.label}</span>
              {f.isStatus ? (
                <Badge variant={statusVariant[String(f.value)] || "secondary"}>
                  {String(f.value)}
                </Badge>
              ) : (
                <span className="text-right max-w-[60%] truncate font-mono text-xs">
                  {String(f.value)}
                </span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {errorMessage && (
        <Card>
          <CardHeader>
            <CardTitle>Error Message</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive whitespace-pre-wrap">{String(errorMessage)}</p>
          </CardContent>
        </Card>
      )}

      {originalPrompt && (
        <Card>
          <CardHeader>
            <CardTitle>Original Prompt</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-xs font-mono overflow-auto max-h-96">
              {typeof originalPrompt === "string"
                ? originalPrompt
                : JSON.stringify(originalPrompt, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {enhancedPrompt && (
        <Card>
          <CardHeader>
            <CardTitle>Enhanced Prompt</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-xs font-mono overflow-auto max-h-96">
              {typeof enhancedPrompt === "string"
                ? enhancedPrompt
                : JSON.stringify(enhancedPrompt, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {systemPrompt && (
        <Card>
          <CardHeader>
            <CardTitle>System Prompt</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-xs font-mono overflow-auto max-h-96">
              {typeof systemPrompt === "string"
                ? systemPrompt
                : JSON.stringify(systemPrompt, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {outputResult && (
        <Card>
          <CardHeader>
            <CardTitle>Output Result</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-xs font-mono overflow-auto max-h-96">
              {typeof outputResult === "string"
                ? outputResult
                : JSON.stringify(outputResult, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
