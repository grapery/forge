"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { PageHeader } from "@/components/shared/page-header"
import { HubGrid } from "@/components/layout/section-nav"
import { Settings, Sparkles } from "lucide-react"
import { opsAssistantApi, type OpsAssistantStatus } from "@/lib/api/admin"
import { Card, CardContent } from "@/components/ui/card"

export default function SettingsHubPage() {
  const t = useTranslations("hub")
  const to = useTranslations("opsAssistant")
  const [status, setStatus] = useState<OpsAssistantStatus | null>(null)

  useEffect(() => {
    opsAssistantApi.status().then(setStatus).catch(() => setStatus(null))
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader title={t("settingsTitle")} description={t("settingsDescription")} icon={Settings} />
      <HubGrid group="settings" />

      <Card>
        <CardContent className="flex items-start gap-3 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{to("title")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {status?.configured
                ? to("statusConfigured", {
                    provider: status.provider,
                    model: status.model,
                    tools: status.tools,
                  })
                : to("notConfigured")}
              {" · "}
              {status?.mcp ? to("statusMcpOn") : to("statusMcpOff")}
            </p>
            <Link href="/ops-assistant" className="inline-block mt-2 text-sm text-primary hover:underline">
              {to("dashboardCta")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
