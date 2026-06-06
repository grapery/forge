"use client"

import { useRef, useEffect, useCallback } from "react"
import * as d3 from "d3"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getThemeColors } from "./chart-theme"
import type { ChartSeries } from "@/lib/chart-data"

interface LineChartProps {
  series: ChartSeries[]
  title?: string
  height?: number
  fill?: boolean
  className?: string
  ariaLabel?: string
  visibleKeys?: Set<string>
}

export function LineChart({
  series,
  title,
  height = 320,
  fill = true,
  className,
  ariaLabel,
  visibleKeys,
}: LineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const draw = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const visible = visibleKeys
      ? series.filter((s) => visibleKeys.has(s.key))
      : series
    if (visible.length === 0 || visible.every((s) => s.values.length === 0)) return

    const colors = getThemeColors()
    const rect = container.getBoundingClientRect()
    const W = Math.floor(rect.width)
    const H = height
    if (W <= 0 || H <= 0) return

    const margin = { top: 12, right: 12, bottom: 32, left: 48 }
    const w = W - margin.left - margin.right
    const h = H - margin.top - margin.bottom
    if (w <= 0 || h <= 0) return

    container.innerHTML = ""

    const svg = d3.select(container).append("svg").attr("width", W).attr("height", H)
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`)

    const allValues = visible.flatMap((s) => s.values).filter((v) => v.date instanceof Date && !isNaN(v.date.getTime()))
    if (allValues.length === 0) return
    const xDomain = d3.extent(allValues, (d) => d.date) as [Date, Date]
    if (!xDomain[0] || !xDomain[1]) return
    const yMax = d3.max(allValues, (d) => d.value) || 1

    const x = d3.scaleTime().domain(xDomain).range([0, w])
    const y = d3.scaleLinear().domain([0, yMax * 1.1]).range([h, 0]).nice()

    const xAxis = d3.axisBottom(x).ticks(Math.min(visible[0].values.length, 7)).tickFormat(d3.timeFormat("%m/%d") as any)
    g.append("g")
      .attr("transform", `translate(0,${h})`)
      .call(xAxis)
      .call((sel) => sel.select(".domain").remove())
      .call((sel) => sel.selectAll("text").attr("fill", colors.text).attr("font-size", "11px"))
      .call((sel) => sel.selectAll(".tick line").attr("stroke", colors.grid).attr("stroke-opacity", 0.5))

    const yAxis = d3.axisLeft(y).ticks(5).tickSize(-w)
    g.append("g")
      .call(yAxis)
      .call((sel) => sel.select(".domain").remove())
      .call((sel) => sel.selectAll("text").attr("fill", colors.text).attr("font-size", "11px"))
      .call((sel) => sel.selectAll(".tick line").attr("stroke", colors.grid).attr("stroke-opacity", 0.3))

    for (const s of visible) {
      const lineGen = d3.line<{ date: Date; value: number }>()
        .x((d) => x(d.date))
        .y((d) => y(d.value))

      if (fill) {
        const areaGen = d3.area<{ date: Date; value: number }>()
          .x((d) => x(d.date))
          .y0(h)
          .y1((d) => y(d.value))

        g.append("path")
          .datum(s.values)
          .attr("fill", s.color)
          .attr("fill-opacity", 0.08)
          .attr("d", areaGen)
      }

      g.append("path")
        .datum(s.values)
        .attr("fill", "none")
        .attr("stroke", s.color)
        .attr("stroke-width", 2)
        .attr("d", lineGen)

      g.selectAll(`.dot-${s.key}`)
        .data(s.values)
        .join("circle")
        .attr("class", `dot-${s.key}`)
        .attr("cx", (d) => x(d.date))
        .attr("cy", (d) => y(d.value))
        .attr("r", 0)
        .attr("fill", s.color)
    }

    const bisectLine = g
      .append("line")
      .attr("stroke", colors.text)
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3")
      .attr("y1", 0)
      .attr("y2", h)
      .style("opacity", 0)

    const tooltipDiv = tooltipRef.current

    svg.on("mousemove", function (event) {
      const [mx] = d3.pointer(event, g.node()!)
      const x0 = x.invert(mx)
      if (!x0) return

      const firstSeries = visible[0]
      if (!firstSeries) return

      let closest = firstSeries.values[0]
      let minDist = Infinity
      for (const v of firstSeries.values) {
        const dist = Math.abs(v.date.getTime() - x0.getTime())
        if (dist < minDist) {
          minDist = dist
          closest = v
        }
      }

      const cx = x(closest.date)
      bisectLine.attr("x1", cx).attr("x2", cx).style("opacity", 1)

      for (const s of visible) {
        g.selectAll(`.dot-${s.key}`)
          .attr("r", (d: any) => (d.date.getTime() === closest.date.getTime() ? 4 : 0))
      }

      if (tooltipDiv) {
        const dateStr = d3.timeFormat("%Y-%m-%d")(closest.date)
        const lines = visible.map((s) => {
          const match = s.values.find((v) => v.date.getTime() === closest.date.getTime())
          return `<span style="color:${s.color}">${s.label}: <strong>${(match?.value ?? 0).toLocaleString()}</strong></span>`
        })
        tooltipDiv.innerHTML = `<div style="font-size:11px;margin-bottom:4px;color:${colors.text}">${dateStr}</div>${lines.join("<br>")}`
        tooltipDiv.style.opacity = "1"
        const svgRect = container.getBoundingClientRect()
        const tx = Math.min(cx + margin.left + 12, svgRect.width - 160)
        tooltipDiv.style.left = `${tx}px`
        tooltipDiv.style.top = `${margin.top}px`
      }
    })

    svg.on("mouseleave", () => {
      bisectLine.style("opacity", 0)
      for (const s of visible) {
        g.selectAll(`.dot-${s.key}`).attr("r", 0)
      }
      if (tooltipDiv) tooltipDiv.style.opacity = "0"
    })
  }, [series, height, fill, visibleKeys])

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
        className="pointer-events-none absolute rounded-lg border bg-card px-3 py-2 shadow-md transition-opacity duration-100"
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
