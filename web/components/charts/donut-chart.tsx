"use client"

import { useRef, useEffect, useCallback } from "react"
import * as d3 from "d3"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getThemeColors, SERIES_COLORS } from "./chart-theme"

interface DonutData {
  label: string
  value: number
}

interface DonutChartProps {
  data: DonutData[]
  title?: string
  height?: number
  centerLabel?: string
  centerValue?: string
  className?: string
}

export function DonutChart({ data, title, height = 260, centerLabel, centerValue, className }: DonutChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const draw = useCallback(() => {
    const container = containerRef.current
    if (!container || data.length === 0) return

    const validData = data.filter((d) => d.value != null && !isNaN(d.value) && d.value >= 0)
    if (validData.length === 0) return

    const colors = getThemeColors()
    const rect = container.getBoundingClientRect()
    const W = Math.floor(rect.width)
    const H = height
    if (W <= 0 || H <= 0) return

    container.innerHTML = ""

    const legendRows = Math.ceil(validData.length / Math.max(1, Math.floor(W / 110)))
    const legendH = Math.max(24, legendRows * 18 + 8)
    const chartH = Math.max(120, H - legendH)
    const size = Math.min(W, chartH)
    const radius = size / 2 - 10
    const innerRadius = radius * 0.62
    const total = validData.reduce((sum, d) => sum + (d.value ?? 0), 0)

    const svg = d3.select(container).append("svg").attr("width", W).attr("height", H)
    const g = svg.append("g").attr("transform", `translate(${W / 2},${chartH / 2})`)

    const color = d3.scaleOrdinal<string>()
      .domain(validData.map((d) => d.label))
      .range(SERIES_COLORS as unknown as string[])

    if (total <= 0) {
      g.append("circle")
        .attr("r", radius)
        .attr("fill", "none")
        .attr("stroke", colors.grid)
        .attr("stroke-width", Math.max(8, radius - innerRadius))
        .attr("stroke-opacity", 0.55)
      g.append("circle")
        .attr("r", innerRadius)
        .attr("fill", colors.card)
    } else {
      const arcGen = d3.arc<d3.PieArcDatum<DonutData>>()
        .innerRadius(innerRadius)
        .outerRadius(radius)
        .padAngle(0.02)

      const pieData = d3.pie<DonutData>()
        .value((d) => d.value)
        .sort(null)(validData)

      g.selectAll("path")
        .data(pieData)
        .join("path")
        .attr("d", arcGen)
        .attr("fill", (d) => color(d.data.label) as string)
        .attr("stroke", colors.card)
        .attr("stroke-width", 2)
        .style("cursor", "pointer")
        .on("mouseenter", function (event, d) {
          d3.select(this).transition().duration(150).attr("d", arcGen.outerRadius(radius + 4)(d) as string)
          const tooltipDiv = tooltipRef.current
          if (tooltipDiv) {
            const pct = ((d.data.value / total) * 100).toFixed(1)
            tooltipDiv.innerHTML = `<div style="font-size:11px;margin-bottom:4px;color:${colors.text}">${d.data.label}</div><div style="color:${colors.text}">${(d.data.value ?? 0).toLocaleString()} (${pct}%)</div>`
            tooltipDiv.style.opacity = "1"
            const svgRect = container.getBoundingClientRect()
            const tx = Math.min(event.offsetX + 12, svgRect.width - 160)
            tooltipDiv.style.left = `${tx}px`
            tooltipDiv.style.top = `${event.offsetY}px`
          }
        })
        .on("mousemove", function (event) {
          const tooltipDiv = tooltipRef.current
          if (tooltipDiv) {
            const svgRect = container.getBoundingClientRect()
            const tx = Math.min(event.offsetX + 12, svgRect.width - 160)
            tooltipDiv.style.left = `${tx}px`
            tooltipDiv.style.top = `${event.offsetY}px`
          }
        })
        .on("mouseleave", function (_, d) {
          d3.select(this).transition().duration(150).attr("d", arcGen.outerRadius(radius)(d) as string)
          if (tooltipRef.current) tooltipRef.current.style.opacity = "0"
        })
    }

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", centerLabel ? "-0.3em" : "0.35em")
      .attr("fill", colors.text)
      .attr("font-size", "18px")
      .attr("font-weight", "bold")
      .text(centerValue ?? total.toLocaleString())

    if (centerLabel) {
      g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "1.2em")
        .attr("fill", colors.text)
        .attr("font-size", "11px")
        .text(centerLabel)
    }

    const itemsPerRow = Math.max(1, Math.floor(W / 110))
    const legend = svg.append("g").attr("transform", `translate(0, ${chartH + 4})`)
    validData.forEach((d, i) => {
      const row = Math.floor(i / itemsPerRow)
      const col = i % itemsPerRow
      const rowWidth = Math.min(itemsPerRow, validData.length - row * itemsPerRow) * 110
      const x = (W - rowWidth) / 2 + col * 110
      const y = row * 18
      legend
        .append("circle")
        .attr("cx", x + 4)
        .attr("cy", y + 6)
        .attr("r", 4)
        .attr("fill", color(d.label) as string)
        .attr("opacity", total > 0 && d.value > 0 ? 1 : 0.45)
      legend
        .append("text")
        .attr("x", x + 12)
        .attr("y", y + 9)
        .attr("fill", colors.text)
        .attr("font-size", "10px")
        .text(`${d.label} ${total > 0 ? ((d.value / total) * 100).toFixed(0) : 0}%`)
    })
  }, [data, height, centerLabel, centerValue])

  useEffect(() => {
    draw()
    const ro = new ResizeObserver(() => draw())
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [draw])

  const content = (
    <div className="relative" style={{ width: "100%", height }}>
      <div ref={containerRef} style={{ width: "100%", height }} />
      <div
        ref={tooltipRef}
        className="pointer-events-none absolute border-border bg-popover rounded-lg px-3 py-2 transition-opacity duration-100"
        style={{ opacity: 0, zIndex: 50, minWidth: 120 }}
      />
    </div>
  )

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
