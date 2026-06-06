"use client"

import { useRef, useEffect, useCallback } from "react"
import * as d3 from "d3"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getThemeColors, SERIES_COLORS } from "./chart-theme"

interface ScatterData {
  x: number
  y: number
  size: number
  label: string
  group?: string
}

interface ScatterChartProps {
  data: ScatterData[]
  title?: string
  height?: number
  xLabel?: string
  yLabel?: string
  className?: string
}

export function ScatterChart({ data, title, height = 300, xLabel, yLabel, className }: ScatterChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const draw = useCallback(() => {
    const container = containerRef.current
    if (!container || data.length === 0) return

    const validData = data.filter((d) => d.x != null && !isNaN(d.x) && d.y != null && !isNaN(d.y))
    if (validData.length === 0) return

    const colors = getThemeColors()
    const rect = container.getBoundingClientRect()
    const W = Math.floor(rect.width)
    const H = height
    if (W <= 0 || H <= 0) return

    const margin = { top: 12, right: 12, bottom: 40, left: 52 }
    const w = W - margin.left - margin.right
    const h = H - margin.top - margin.bottom
    if (w <= 0 || h <= 0) return

    container.innerHTML = ""

    const svg = d3.select(container).append("svg").attr("width", W).attr("height", H)
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`)

    const xExt = d3.extent(validData, (d) => d.x) as [number, number]
    const yExt = d3.extent(validData, (d) => d.y) as [number, number]
    if (xExt[0] == null || xExt[1] == null || yExt[0] == null || yExt[1] == null) return

    const sizeMax = d3.max(validData, (d) => d.size) || 1

    const x = d3.scaleLinear().domain([xExt[0] * 0.9, xExt[1] * 1.1]).range([0, w]).nice()
    const y = d3.scaleLinear().domain([yExt[0] * 0.9, yExt[1] * 1.1]).range([h, 0]).nice()
    const r = d3.scaleLinear().domain([0, sizeMax]).range([4, 24])

    const groups = [...new Set(validData.map((d) => d.group || "default"))]
    const colorScale = d3.scaleOrdinal<string>().domain(groups).range(SERIES_COLORS as unknown as string[])

    g.append("g")
      .attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(x).ticks(6))
      .call((sel) => sel.select(".domain").remove())
      .call((sel) => sel.selectAll("text").attr("fill", colors.text).attr("font-size", "10px"))
      .call((sel) => sel.selectAll(".tick line").attr("stroke", colors.grid).attr("stroke-opacity", 0.3))

    g.append("g")
      .call(d3.axisLeft(y).ticks(5).tickSize(-w))
      .call((sel) => sel.select(".domain").remove())
      .call((sel) => sel.selectAll("text").attr("fill", colors.text).attr("font-size", "10px"))
      .call((sel) => sel.selectAll(".tick line").attr("stroke", colors.grid).attr("stroke-opacity", 0.3))

    if (xLabel) {
      g.append("text").attr("x", w / 2).attr("y", h + 34).attr("text-anchor", "middle").attr("fill", colors.text).attr("font-size", "11px").text(xLabel)
    }
    if (yLabel) {
      g.append("text").attr("transform", "rotate(-90)").attr("y", -40).attr("x", -h / 2).attr("text-anchor", "middle").attr("fill", colors.text).attr("font-size", "11px").text(yLabel)
    }

    const tooltipDiv = tooltipRef.current

    g.selectAll("circle")
      .data(validData)
      .join("circle")
      .attr("cx", (d) => x(d.x))
      .attr("cy", (d) => y(d.y))
      .attr("r", (d) => r(d.size ?? 0))
      .attr("fill", (d) => colorScale(d.group || "default") as string)
      .attr("fill-opacity", 0.65)
      .attr("stroke", (d) => colorScale(d.group || "default") as string)
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .on("mouseenter", function (event, d) {
        d3.select(this).attr("fill-opacity", 0.9)
        if (tooltipDiv) {
          tooltipDiv.innerHTML = `<div style="font-size:11px;margin-bottom:2px;font-weight:600;color:${colors.text}">${d.label}</div>
            <div style="font-size:10px;color:${colors.text}">${xLabel || "X"}: ${(d.x ?? 0).toLocaleString()}</div>
            <div style="font-size:10px;color:${colors.text}">${yLabel || "Y"}: ${(d.y ?? 0).toLocaleString()}</div>`
          tooltipDiv.style.opacity = "1"
          const svgRect = container.getBoundingClientRect()
          tooltipDiv.style.left = `${Math.min(x(d.x) + margin.left + 12, svgRect.width - 140)}px`
          tooltipDiv.style.top = `${y(d.y) + margin.top - 10}px`
        }
      })
      .on("mouseleave", function () {
        d3.select(this).attr("fill-opacity", 0.65)
        if (tooltipDiv) tooltipDiv.style.opacity = "0"
      })
  }, [data, height, xLabel, yLabel])

  useEffect(() => {
    draw()
    const ro = new ResizeObserver(() => draw())
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [draw])

  const content = (
    <div className="relative" style={{ width: "100%", height }}>
      <div ref={containerRef} style={{ width: "100%", height }} />
      <div ref={tooltipRef} className="pointer-events-none absolute rounded-lg border bg-card px-3 py-2 shadow-md" style={{ opacity: 0, zIndex: 50 }} />
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
