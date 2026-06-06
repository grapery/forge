"use client"

import { useRef, useEffect, useCallback } from "react"
import * as d3 from "d3"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getThemeColors, SERIES_COLORS } from "./chart-theme"

interface FunnelData {
  label: string
  value: number
}

interface FunnelChartProps {
  data: FunnelData[]
  title?: string
  height?: number
  className?: string
}

export function FunnelChart({ data, title, height = 200, className }: FunnelChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const draw = useCallback(() => {
    const container = containerRef.current
    if (!container || data.length === 0) return

    const validData = data.filter((d) => d.value != null && !isNaN(d.value) && d.value > 0)
    if (validData.length === 0) return

    const colors = getThemeColors()
    const rect = container.getBoundingClientRect()
    const W = Math.floor(rect.width)
    const H = height
    if (W <= 0 || H <= 0) return

    container.innerHTML = ""
    const svg = d3.select(container).append("svg").attr("width", W).attr("height", H)

    const maxVal = validData[0].value || 1
    const gap = 4
    const stepH = (H - gap * (validData.length - 1)) / validData.length
    const centerX = W / 2

    validData.forEach((d, i) => {
      const ratio = d.value / maxVal
      const barW = Math.max(ratio * (W - 80), 20)
      const x = centerX - barW / 2
      const y = i * (stepH + gap)
      const pct = maxVal > 0 ? ((d.value / maxVal) * 100).toFixed(1) : "0.0"

      svg
        .append("rect")
        .attr("x", x)
        .attr("y", y)
        .attr("width", barW)
        .attr("height", stepH)
        .attr("fill", SERIES_COLORS[i % SERIES_COLORS.length])
        .attr("rx", 4)
        .attr("opacity", 0.85)

      svg
        .append("text")
        .attr("x", centerX)
        .attr("y", y + stepH / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .attr("fill", "#ffffff")
        .attr("font-size", "12px")
        .attr("font-weight", "bold")
        .text(`${d.label}  ${(d.value ?? 0).toLocaleString()} (${pct}%)`)
    })
  }, [data, height])

  useEffect(() => {
    draw()
    const ro = new ResizeObserver(() => draw())
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [draw])

  const content = <div ref={containerRef} style={{ width: "100%", height }} />

  if (title) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    )
  }

  return <div className={className}>{content}</div>
}
