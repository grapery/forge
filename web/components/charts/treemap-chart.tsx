"use client"

import { useRef, useEffect, useCallback } from "react"
import * as d3 from "d3"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getThemeColors, SERIES_COLORS } from "./chart-theme"

interface TreemapData {
  label: string
  value: number
  category?: string
}

interface TreemapChartProps {
  data: TreemapData[]
  title?: string
  height?: number
  className?: string
}

export function TreemapChart({ data, title, height = 300, className }: TreemapChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const draw = useCallback(() => {
    const container = containerRef.current
    if (!container || data.length === 0) return

    const colors = getThemeColors()
    const rect = container.getBoundingClientRect()
    const W = Math.floor(rect.width)
    const H = height
    if (W <= 0 || H <= 0) return

    container.innerHTML = ""

    const svg = d3.select(container).append("svg").attr("width", W).attr("height", H)

    const root = d3.hierarchy({ children: data } as any)
      .sum((d: any) => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0))

    d3.treemap<{ children: TreemapData[] }>()
      .size([W, H])
      .padding(2)
      .round(true)(root)

    const leaves = root.leaves() as d3.HierarchyRectangularNode<any>[]

    const colorScale = d3.scaleOrdinal<string>()
      .domain(data.map((d) => d.label))
      .range(SERIES_COLORS as unknown as string[])

    const cell = svg.selectAll("g")
      .data(leaves)
      .join("g")
      .attr("transform", (d) => `translate(${d.x0},${d.y0})`)

    cell.append("rect")
      .attr("width", (d) => Math.max(0, d.x1 - d.x0))
      .attr("height", (d) => Math.max(0, d.y1 - d.y0))
      .attr("fill", (d) => colorScale((d.data as any).label) as string)
      .attr("fill-opacity", 0.85)
      .attr("rx", 3)
      .style("cursor", "pointer")
      .append("title")
      .text((d) => `${(d.data as any).label}: ${((d.data as any).value ?? 0).toLocaleString()}`)

    cell.each(function (d) {
      const w = d.x1 - d.x0
      const h = d.y1 - d.y0
      if (w < 30 || h < 18) return

      d3.select(this).append("text")
        .attr("x", 4)
        .attr("y", 14)
        .attr("fill", "#ffffff")
        .attr("font-size", w > 60 ? "11px" : "9px")
        .attr("font-weight", "500")
        .text(((d.data as any).label.length * 7 > w - 8) ? (d.data as any).label.slice(0, Math.floor((w - 8) / 7)) + "…" : (d.data as any).label)

      if (h > 30 && w > 40) {
        d3.select(this).append("text")
          .attr("x", 4)
          .attr("y", 28)
          .attr("fill", "rgba(255,255,255,0.8)")
          .attr("font-size", "10px")
          .text(((d.data as any).value ?? 0).toLocaleString())
      }
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
