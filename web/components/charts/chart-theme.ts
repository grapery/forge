const SERIES_COLORS = [
  "#2383E2", // notion blue
  "#0F7B6C", // teal
  "#CB912F", // amber
  "#D9730D", // orange
  "#337EA9", // slate blue
  "#E03E3E", // red
  "#5D6B7A", // cool gray
] as const

function getCssVar(name: string): string {
  if (typeof document === "undefined") return ""
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export function getThemeColors() {
  return {
    primary: getCssVar("--primary") || "#2383E2",
    text: getCssVar("--muted-foreground") || "#787774",
    grid: "rgba(55, 53, 47, 0.08)",
    card: getCssVar("--card") || "#ffffff",
    background: getCssVar("--background") || "#ffffff",
    positive: "#0F7B6C",
    negative: "#E03E3E",
    neutral: "#787774",
    series: [...SERIES_COLORS],
  }
}

export { SERIES_COLORS }
