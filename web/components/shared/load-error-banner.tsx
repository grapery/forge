"use client"

import { RefreshCw } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"

export function LoadErrorBanner({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  const t = useTranslations("common")
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--status-danger)]/20 bg-[var(--status-danger-bg)] px-3 py-2.5 text-sm text-[var(--status-danger)]">
      <p className="min-w-0 flex-1">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="shrink-0" onClick={onRetry}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          {t("retry")}
        </Button>
      )}
    </div>
  )
}
