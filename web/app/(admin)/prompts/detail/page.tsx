"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
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
import { AdminPage } from "@/components/layout/admin-page"


export default function PromptDetailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const t = useTranslations("promptsDetail")
  const id = searchParams.get("id")
  const [record, setRecord] = useState<PromptAuditRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    promptApi.get(id).then(setRecord).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  if (loading) return <PageSkeleton />
  if (!record) return <div className="py-12 text-center text-muted-foreground">{t("notFound")}</div>

  const formatTime = (ts: number) => new Date(ts * 1000).toLocaleString()

  return (
    <AdminPage>
      <PageHeader
        title={t("title")}
        description={t("description", { provider: record.provider, model: record.model, time: formatTime(record.createdAt) })}
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />{t("buttonBack")}
          </Button>
        }
      />

      <Card>
        <CardHeader><CardTitle>{t("cardOverview")}</CardTitle></CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div><span className="text-muted-foreground">{t("fieldProvider")}:</span> <Badge>{record.provider}</Badge></div>
            <div><span className="text-muted-foreground">{t("fieldModel")}:</span> {record.model}</div>
            <div><span className="text-muted-foreground">{t("fieldStep")}:</span> {record.step}</div>
            <div><span className="text-muted-foreground">{t("fieldKind")}:</span> {record.promptKind}</div>
            <div><span className="text-muted-foreground">{t("fieldTemperature")}:</span> {record.temperature}</div>
            <div><span className="text-muted-foreground">{t("fieldMaxTokens")}:</span> {record.maxTokens}</div>
            <div><span className="text-muted-foreground">{t("fieldInputTokens")}:</span> {record.inputTokens}</div>
            <div><span className="text-muted-foreground">{t("fieldOutputTokens")}:</span> {record.outputTokens}</div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div><span className="text-muted-foreground">{t("fieldEntityType")}:</span> {record.relatedEntityType}</div>
            <div><span className="text-muted-foreground">{t("fieldEntityId")}:</span> <code className="text-xs">{record.relatedEntityId}</code></div>
            <div><span className="text-muted-foreground">{t("fieldTemplateVersion")}:</span> {record.promptTemplateVersion}</div>
          </div>
        </CardContent>
      </Card>

      {record.systemPrompt && (
        <Card>
          <CardHeader><CardTitle>{t("cardSystemPrompt")}</CardTitle></CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-xs font-mono overflow-auto max-h-80">{record.systemPrompt}</pre>
          </CardContent>
        </Card>
      )}

      {record.userPrompt && (
        <Card>
          <CardHeader><CardTitle>{t("cardUserPrompt")}</CardTitle></CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-xs font-mono overflow-auto max-h-80">{record.userPrompt}</pre>
          </CardContent>
        </Card>
      )}

      {record.output && (
        <Card>
          <CardHeader><CardTitle>{t("cardOutput")}</CardTitle></CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-xs font-mono overflow-auto max-h-80">{record.output}</pre>
          </CardContent>
        </Card>
      )}
    </AdminPage>
  )
}
