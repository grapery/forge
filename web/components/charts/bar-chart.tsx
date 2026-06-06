"use client"

import { useRef, useEffect, useCallback } from "react"
import * as d3 from "d3"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getThemeColors, SERIES_COLORS } from "./chart-theme"

interface BarData {
  label: string
  value: number
}

interface BarChartProps {
  data: BarData[]
  title?: string
  height?: number
  horizontal?: boolean
  color?: string
  className?: string
  valueFormatter?: (v: number) => string
}

export function BarChart({
  data,
  title,
  height = 260,
  horizontal = false,
  color,
  className,
  valueFormatter,
}: BarChartProps) {
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

    const barColor = color || colors.primary

    const svg = d3.select(container).append("svg").attr("width", W).attr("height", H)

    if (horizontal) {
      const margin = { top: 8, right: 60, bottom: 8, left: 80 }
      const w = W - margin.left - margin.right
      const h = H - margin.top - margin.bottom
      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`)

      const y = d3.scaleBand().domain(data.map((d) => d.label)).range([0, h]).padding(0.25)
      const x = d3.scaleLinear()
        .domain([0, d3.max(data, (d) => d.value) || 1])
        .range([0, w])

      g.selectAll("rect")
        .data(data)
        .join("rect")
        .attr("y", (d) => y(d.label)!)
        .attr("height", y.bandwidth())
        .attr("x", 0)
        .attr("width", 0)
        .attr("fill", barColor)
        .attr("rx", 3)
        .transition()
        .duration(500)
        .attr("width", (d) => x(d.value))

      g.selectAll(".bar-label")
        .data(data)
        .join("text")
        .attr("class", "bar-label")
        .attr("x", (d) => x(d.value) + 6)
        .attr("y", (d) => y(d.label)! + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("fill", colors.text)
        .attr("font-size", "11px")
        .text((d) => valueFormatter ? valueFormatter(d.value) : d.value.toLocaleString())

      g.selectAll(".bar-name")
        .data(data)
        .join("text")
        .attr("class", "bar-name")
        .attr("x", -6)
        .attr("y", (d) => y(d.label)! + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "end")
        .attr("fill", colors.text)
        .attr("font-size", "11px")
        .text((d) => d.label.length > 10 ? d.label.slice(0, 10) + "…" : d.label)
    } else {
      const margin = { top: 12, right: 12, bottom: 40, left: 48 }
      const w = W - margin.left - margin.right
      const h = H - margin.top - margin.bottom
      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`)

      const x = d3.scaleBand().domain(data.map((d) => d.label)).range([0, w]).padding(0.3)
      const y = d3.scaleLinear()
        .domain([0, d3.max(data, (d) => d.value) || 1])
        .range([h, 0])
        .nice()

      g.append("g")
        .attr("transform", `translate(0,${h})`)
        .call(d3.axisBottom(x))
        .call((g) => g.select(".domain").remove())
        .call((g) => g.selectAll("text").attr("fill", colors.text).attr("font-size", "10px"))

      g.append("g")
        .call(d3.axisLeft(y).ticks(5).tickSize(-w))
        .call((g) => g.select(".domain").remove())
        .call((g) => g.selectAll("text").attr("fill", colors.text).attr("font-size", "11px"))
        .call((g) => g.selectAll(".tick line").attr("stroke", colors.grid).attr("stroke-opacity", 0.3))

      g.selectAll("rect")
        .data(data)
        .join("rect")
        .attr("x", (d) => x(d.label)!)
        .attr("width", x.bandwidth())
        .attr("y", h)
        .attr("height", 0)
        .attr("fill", barColor)
        .attr("rx", 2)
        .transition()
        .duration(500)
        .attr("y", (d) => y(d.value))
        .attr("height", (d) => h - y(d.value))

      g.selectAll(".bar-label")
        .data(data)
        .join("text")
        .attr("class", "bar-label")
        .attr("x", (d) => x(d.label)! + x.bandwidth() / 2)
        .attr("y", (d) => y(d.value) - 4)
        .attr("text-anchor", "middle")
        .attr("fill", colors.text)
        .attr("font-size", "10px")
        .text((d) => valueFormatter ? valueFormatter(d.value) : d.value.toLocaleString())
    }
  }, [data, height, horizontal, color, valueFormatter])

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
