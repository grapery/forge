"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { PageHeader } from "@/components/shared/page-header"
import { HubGrid } from "@/components/layout/section-nav"
import { Layers } from "lucide-react"
import { aiTaskApi, accountDeletionApi } from "@/lib/api/admin"
import type { HubBadge } from "@/lib/nav"

export default function OperationsHubPage() {
  const t = useTranslations("hub")
  const [badges, setBadges] = useState<Record<string, HubBadge>>({})

  useEffect(() => {
    let cancelled = false
    Promise.all([
      aiTaskApi.summary().catch(() => null),
      accountDeletionApi.statusCounts().catch(() => null),
    ]).then(([ai, deletions]) => {
      if (cancelled) return
      const next: Record<string, HubBadge> = {}
      const failed = ai?.failedTasks ?? 0
      const pending = ai?.pendingTasks ?? 0
      if (failed > 0) next["/ai-tasks"] = { value: failed, tone: "danger" }
      else if (pending > 0) next["/ai-tasks"] = { value: pending, tone: "warning" }
      const pendingDeletes = deletions?.pending ?? 0
      if (pendingDeletes > 0) next["/account-deletions"] = { value: pendingDeletes, tone: "warning" }
      setBadges(next)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div>
      <PageHeader title={t("operationsTitle")} description={t("operationsDescription")} icon={Layers} />
      <HubGrid group="operations" badges={badges} />
    </div>
  )
}
