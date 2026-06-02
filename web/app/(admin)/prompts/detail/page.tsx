"use client"

import { useEffect, useState } from "react"
import { PageSkeleton } from "@/components/shared/skeleton"

import { useSearchParams } from "next/navigation"

import { promptApi } from "@/lib/api/admin"

import type { PromptAuditRecord } from "@/lib/types"

import { PageHeader } from "@/components/shared/page-header"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { Badge } from "@/components/ui/badge"

import { Button } from "@/components/ui/button"

import { ArrowLeft } from "lucide-react"

import { useRouter } from "next/navigation"


export default function PromptDetailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = searchParams.get("id")
  const [record, setRecord] = useState<PromptAuditRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    promptApi.get(id).then(setRecord).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  if (loading) return <PageSkeleton />
  if (!record) return <div className="py-12 text-center text-muted-foreground">Record not found</div>

  const formatTime = (ts: number) => new Date(ts * 1000).toLocaleString()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prompt Audit Record"
        description={`${record.provider} / ${record.model} - ${formatTime(record.createdAt)}`}
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />Back
          </Button>
        }
      />

      <Card>
        <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div><span className="text-muted-foreground">Provider:</span> <Badge>{record.provider}</Badge></div>
            <div><span className="text-muted-foreground">Model:</span> {record.model}</div>
            <div><span className="text-muted-foreground">Step:</span> {record.step}</div>
            <div><span className="text-muted-foreground">Kind:</span> {record.promptKind}</div>
            <div><span className="text-muted-foreground">Temperature:</span> {record.temperature}</div>
            <div><span className="text-muted-foreground">Max Tokens:</span> {record.maxTokens}</div>
            <div><span className="text-muted-foreground">Input Tokens:</span> {record.inputTokens}</div>
            <div><span className="text-muted-foreground">Output Tokens:</span> {record.outputTokens}</div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div><span className="text-muted-foreground">Entity Type:</span> {record.relatedEntityType}</div>
            <div><span className="text-muted-foreground">Entity ID:</span> <code className="text-xs">{record.relatedEntityId}</code></div>
            <div><span className="text-muted-foreground">Template Version:</span> {record.promptTemplateVersion}</div>
          </div>
        </CardContent>
      </Card>

      {record.systemPrompt && (
        <Card>
          <CardHeader><CardTitle>System Prompt</CardTitle></CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-xs font-mono overflow-auto max-h-80">{record.systemPrompt}</pre>
          </CardContent>
        </Card>
      )}

      {record.userPrompt && (
        <Card>
          <CardHeader><CardTitle>User Prompt</CardTitle></CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-xs font-mono overflow-auto max-h-80">{record.userPrompt}</pre>
          </CardContent>
        </Card>
      )}

      {record.output && (
        <Card>
          <CardHeader><CardTitle>Output</CardTitle></CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-xs font-mono overflow-auto max-h-80">{record.output}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
