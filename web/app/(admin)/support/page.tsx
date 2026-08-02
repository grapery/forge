"use client"

import { useTranslations } from "next-intl"
import { PageHeader } from "@/components/shared/page-header"
import { HubGrid } from "@/components/layout/section-nav"
import { MessageSquare } from "lucide-react"

export default function SupportHubPage() {
  const t = useTranslations("hub")
  return (
    <div>
      <PageHeader title={t("supportTitle")} description={t("supportDescription")} icon={MessageSquare} />
      <HubGrid group="support" />
    </div>
  )
}
