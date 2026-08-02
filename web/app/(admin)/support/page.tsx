"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { PageHeader } from "@/components/shared/page-header"
import { HubGrid } from "@/components/layout/section-nav"
import { MessageSquare } from "lucide-react"
import { dashboardApi, feedbackApi, reportApi } from "@/lib/api/admin"
import type { HubBadge } from "@/lib/nav"

export default function SupportHubPage() {
  const t = useTranslations("hub")
  const [badges, setBadges] = useState<Record<string, HubBadge>>({})

  useEffect(() => {
    let cancelled = false
    Promise.all([
      dashboardApi.getOverview("7d").catch(() => null),
      feedbackApi.statusCounts().catch(() => null),
      reportApi.moderationSummary().catch(() => null),
    ]).then(([overview, feedbackCounts, moderation]) => {
      if (cancelled) return
      const next: Record<string, HubBadge> = {}
      const overdueFeedback = overview?.overdueFeedback ?? 0
      const openFeedback =
        (feedbackCounts?.received ?? 0) + (feedbackCounts?.processing ?? 0)
      const pendingReports =
        (moderation?.pendingUserReports ?? overview?.pendingUserReports ?? 0) +
        (moderation?.pendingContentReports ?? overview?.pendingContentReports ?? 0)
      const overdueReports = moderation?.overdueTotal ?? overview?.overdueReportsTotal ?? 0

      if (overdueFeedback > 0) {
        next["/feedback"] = { value: overdueFeedback, tone: "danger" }
      } else if (openFeedback > 0) {
        next["/feedback"] = { value: openFeedback, tone: "warning" }
      }

      if (overdueReports > 0) {
        next["/reports"] = { value: overdueReports, tone: "danger" }
      } else if (pendingReports > 0) {
        next["/reports"] = { value: pendingReports, tone: "warning" }
      }

      setBadges(next)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div>
      <PageHeader title={t("supportTitle")} description={t("supportDescription")} icon={MessageSquare} />
      <HubGrid group="support" badges={badges} />
    </div>
  )
}
