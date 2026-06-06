"use client"

import { useRef, useEffect, useCallback } from "react"
import * as d3 from "d3"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getThemeColors } from "./chart-theme"

interface HeatmapData {
  date: string
  value: number
}

interface HeatmapCalendarProps {
  data: HeatmapData[]
  title?: string
  weeks?: number
  className?: string
}

export function HeatmapCalendar({ data, title, weeks = 12, className }: HeatmapCalendarProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const draw = useCallback(() => {
    const container = containerRef.current
    if (!container || data.length === 0) return

    const validData = data.filter((d) => d.date && !isNaN(new Date(d.date).getTime()))
    if (validData.length === 0) return

    const colors = getThemeColors()
    const rect = container.getBoundingClientRect()
    const W = Math.floor(rect.width)
    if (W <= 0) return

    const cellSize = Math.min(14, Math.floor((W - 30) / weeks))
    const cellPad = 2
    const H = cellSize * 7 + cellPad * 7 + 30

    container.innerHTML = ""
    const svg = d3.select(container).append("svg").attr("width", W).attr("height", H)

    const dataMap = new Map(validData.map((d) => [d.date, d.value]))
    const maxVal = d3.max(validData, (d) => d.value) || 1

    const endDate = new Date(validData[validData.length - 1].date)
    const startDate = d3.timeDay.offset(endDate, -(weeks * 7))

    const colorScale = d3.scaleLinear<string>()
      .domain([0, maxVal * 0.5, maxVal])
      .range(["#e5e5e5", colors.positive, "#059669"])

    const weeksRange = d3.timeWeek.range(startDate, endDate)
    const dayLabels = ["Sun", "", "Tue", "", "Thu", "", "Sat"]

    svg
      .append("g")
      .attr("transform", "translate(24, 16)")
      .selectAll("text")
      .data(dayLabels)
      .join("text")
      .attr("x", -4)
      .attr("y", (_d, i) => i * (cellSize + cellPad) + cellSize / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      .attr("fill", colors.text)
      .attr("font-size", "9px")
      .text((d) => d)

    const g = svg.append("g").attr("transform", "translate(28, 16)")

    weeksRange.forEach((weekStart, wi) => {
      for (let di = 0; di < 7; di++) {
        const day = d3.timeDay.offset(weekStart, di)
        if (day > endDate) return
        const dateStr = d3.timeFormat("%Y-%m-%d")(day)
        const val = dataMap.get(dateStr) || 0
        const x = wi * (cellSize + cellPad)
        const y = di * (cellSize + cellPad)

        g.append("rect")
          .attr("x", x)
          .attr("y", y)
          .attr("width", cellSize)
          .attr("height", cellSize)
          .attr("rx", 2)
          .attr("fill", val > 0 ? colorScale(val) : "#f0f0f0")
          .attr("stroke", "none")
          .append("title")
          .text(`${dateStr}: ${val.toLocaleString()}`)
      }
    })
  }, [data, weeks])

  useEffect(() => {
    draw()
    const ro = new ResizeObserver(() => draw())
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [draw])

  const content = <div ref={containerRef} style={{ width: "100%" }} />

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
