"use client"

import { SERIES_COLORS } from "./chart-theme"

interface ChartLegendProps {
  items: { key: string; label: string; color: string }[]
  visibleKeys: Set<string>
  onToggle: (key: string) => void
}

export function ChartLegend({ items, visibleKeys, onToggle }: ChartLegendProps) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {items.map((item) => {
        const active = visibleKeys.has(item.key)
        return (
          <button
            key={item.key}
            onClick={() => onToggle(item.key)}
            className="flex items-center gap-1.5 text-xs transition-opacity duration-150 hover:opacity-80"
            style={{ opacity: active ? 1 : 0.4 }}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className={active ? "text-foreground font-medium" : "text-muted-foreground"}>
              {item.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
