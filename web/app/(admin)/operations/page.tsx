"use client"

import { useTranslations } from "next-intl"
import { PageHeader } from "@/components/shared/page-header"
import { HubGrid } from "@/components/layout/section-nav"
import { Layers } from "lucide-react"

export default function OperationsHubPage() {
  const t = useTranslations("hub")
  return (
    <div>
      <PageHeader title={t("operationsTitle")} description={t("operationsDescription")} icon={Layers} />
      <HubGrid group="operations" />
    </div>
  )
}
