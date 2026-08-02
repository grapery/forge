/** Matches forge backend reportSLADuration (24h). */
export const REPORT_SLA_MS = 24 * 60 * 60 * 1000

export type ReportSlaInfo =
  | { kind: "overdue"; overdueHours: number; ageHours: number }
  | { kind: "remaining"; remainingHours: number; ageHours: number }
  | { kind: "closed"; ageHours: number }

export function getReportSlaInfo(createdAtSec: number, status: string, nowMs = Date.now()): ReportSlaInfo {
  const createdMs = createdAtSec > 1e12 ? createdAtSec : createdAtSec * 1000
  const ageMs = Math.max(0, nowMs - createdMs)
  const ageHours = Math.floor(ageMs / 3_600_000)
  if (status !== "pending") {
    return { kind: "closed", ageHours }
  }
  const remainingMs = REPORT_SLA_MS - ageMs
  if (remainingMs < 0) {
    return {
      kind: "overdue",
      overdueHours: Math.max(1, Math.ceil(-remainingMs / 3_600_000)),
      ageHours,
    }
  }
  return {
    kind: "remaining",
    remainingHours: Math.max(0, Math.ceil(remainingMs / 3_600_000)),
    ageHours,
  }
}
