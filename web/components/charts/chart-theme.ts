const SERIES_COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#10b981", // emerald
  "#f59e0b", // amber
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#ef4444", // red
] as const

function getCssVar(name: string): string {
  if (typeof document === "undefined") return ""
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export function getThemeColors() {
  return {
    primary: getCssVar("--primary") || "#2563eb",
    text: getCssVar("--muted-foreground") || "#737373",
    grid: getCssVar("--border") || "#e5e5e5",
    card: getCssVar("--card") || "#ffffff",
    background: getCssVar("--background") || "#ffffff",
    positive: "#10b981",
    negative: "#ef4444",
    neutral: "#737373",
    series: [...SERIES_COLORS],
  }
}

export { SERIES_COLORS }
