import type { DailyTrend } from "./types"

export interface ChartSeries {
  key: string
  label: string
  color: string
  values: { date: Date; value: number }[]
}

export function dailyTrendToSeries(
  trends: DailyTrend[],
  keys: { key: keyof DailyTrend; label: string; color: string }[],
): ChartSeries[] {
  return keys.map(({ key, label, color }) => ({
    key: key as string,
    label,
    color,
    values: trends.map((t) => ({
      date: new Date(t.date),
      value: Number(t[key]) || 0,
    })),
  }))
}

export function aggregateBy<T extends Record<string, unknown>>(
  items: T[],
  key: keyof T,
): { label: string; value: number }[] {
  const map = new Map<string, number>()
  for (const item of items) {
    const k = String(item[key])
    map.set(k, (map.get(k) || 0) + 1)
  }
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

export function toDonutData(
  data: Record<string, number>,
  labels?: Record<string, string>,
): { label: string; value: number }[] {
  return Object.entries(data)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ label: labels?.[k] ?? k, value: v }))
    .sort((a, b) => b.value - a.value)
}
