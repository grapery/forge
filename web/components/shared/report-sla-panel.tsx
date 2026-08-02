"use client"

import { getReportSlaInfo } from "@/lib/report-sla"

type Labels = {
  fieldSla: string
  slaOverdueBy: (hours: number) => string
  slaRemaining: (hours: number) => string
  slaClosed: (hours: number) => string
  slaOverdue: string
}

export function ReportSlaPanel({
  createdAt,
  status,
  isOverdue,
  labels,
}: {
  createdAt: number
  status: string
  isOverdue?: boolean
  labels: Labels
}) {
  const sla = getReportSlaInfo(createdAt, status)
  const overdue = isOverdue || sla.kind === "overdue"

  let text = labels.slaClosed(sla.ageHours)
  if (sla.kind === "overdue") text = labels.slaOverdueBy(sla.overdueHours)
  else if (sla.kind === "remaining") text = labels.slaRemaining(sla.remainingHours)

  return (
    <div>
      <p className="text-xs text-muted-foreground">{labels.fieldSla}</p>
      <div className="flex flex-wrap items-center gap-1 mt-1">
        <span
          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
            overdue
              ? "bg-[var(--status-danger-bg)] text-[var(--status-danger)]"
              : sla.kind === "remaining"
                ? "bg-[var(--status-warning-bg)] text-[var(--status-warning)]"
                : "bg-secondary text-muted-foreground"
          }`}
        >
          {text}
        </span>
        {overdue && sla.kind !== "overdue" && (
          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-[var(--status-danger-bg)] text-[var(--status-danger)]">
            {labels.slaOverdue}
          </span>
        )}
      </div>
    </div>
  )
}
