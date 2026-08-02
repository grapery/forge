/** Support desk targets: first touch within 24h; escalate past 72h. */
export const FEEDBACK_SLA_WARN_MS = 24 * 60 * 60 * 1000
export const FEEDBACK_SLA_CRITICAL_MS = 72 * 60 * 60 * 1000

const OPEN_STATUSES = new Set(["received", "processing"])

export type FeedbackSlaInfo =
  | { kind: "fresh"; ageHours: number; remainingToWarnHours: number }
  | { kind: "aging"; ageHours: number; pastWarnHours: number }
  | { kind: "critical"; ageHours: number; pastCriticalHours: number }
  | { kind: "closed"; ageHours: number }

export function isFeedbackOpen(status: string): boolean {
  return OPEN_STATUSES.has(status)
}

export function getFeedbackSlaInfo(
  createdAtSec: number,
  status: string,
  nowMs = Date.now(),
): FeedbackSlaInfo {
  const createdMs = createdAtSec > 1e12 ? createdAtSec : createdAtSec * 1000
  const ageMs = Math.max(0, nowMs - createdMs)
  const ageHours = Math.floor(ageMs / 3_600_000)

  if (!isFeedbackOpen(status)) {
    return { kind: "closed", ageHours }
  }
  if (ageMs >= FEEDBACK_SLA_CRITICAL_MS) {
    return {
      kind: "critical",
      ageHours,
      pastCriticalHours: Math.max(1, Math.ceil((ageMs - FEEDBACK_SLA_CRITICAL_MS) / 3_600_000)),
    }
  }
  if (ageMs >= FEEDBACK_SLA_WARN_MS) {
    return {
      kind: "aging",
      ageHours,
      pastWarnHours: Math.max(1, Math.ceil((ageMs - FEEDBACK_SLA_WARN_MS) / 3_600_000)),
    }
  }
  return {
    kind: "fresh",
    ageHours,
    remainingToWarnHours: Math.max(0, Math.ceil((FEEDBACK_SLA_WARN_MS - ageMs) / 3_600_000)),
  }
}

export function isFeedbackOverdue(
  createdAtSec: number,
  status: string,
  nowMs = Date.now(),
): boolean {
  const sla = getFeedbackSlaInfo(createdAtSec, status, nowMs)
  return sla.kind === "aging" || sla.kind === "critical"
}
