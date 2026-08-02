"use client"

import { useTranslations } from "next-intl"
import { PageHeader } from "@/components/shared/page-header"
import { HubGrid } from "@/components/layout/section-nav"
import { BarChart3 } from "lucide-react"

export default function AnalyticsHubPage() {
  const t = useTranslations("hub")
  return (
    <div>
      <PageHeader title={t("analyticsTitle")} description={t("analyticsDescription")} icon={BarChart3} />
      <HubGrid group="analytics" />
    </div>
  )
}
