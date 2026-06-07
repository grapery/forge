const SERIES_COLORS = [
  "#7A39EC", // primary purple
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
    primary: getCssVar("--primary") || "#7A39EC",
    text: getCssVar("--muted-foreground") || "#6b6b8a",
    grid: "rgba(255,255,255,0.06)",
    card: getCssVar("--card") || "#12121e",
    background: getCssVar("--background") || "#0a0a12",
    positive: "#10b981",
    negative: "#ef4444",
    neutral: "#6b6b8a",
    series: [...SERIES_COLORS],
  }
}

export { SERIES_COLORS }
