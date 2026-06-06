"use client"

import { useRef, useEffect, useCallback } from "react"
import * as d3 from "d3"

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  className?: string
}

export function Sparkline({ data, width = 80, height = 28, color, className }: SparklineProps) {
  const ref = useRef<SVGSVGElement>(null)

  const draw = useCallback(() => {
    const svg = ref.current
    if (!svg || data.length < 2) return

    const c = color || (typeof document !== "undefined" ? getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() : "#2563eb")

    const x = d3.scaleLinear().domain([0, data.length - 1]).range([2, width - 2])
    const yExt = d3.extent(data) as [number, number]
    const y = d3.scaleLinear().domain([yExt[0] - (yExt[1] - yExt[0]) * 0.1, yExt[1] * 1.1]).range([height - 2, 2])

    const lineGen = d3.line<number>()
      .x((_, i) => x(i))
      .y((d) => y(d))

    d3.select(svg).selectAll("*").remove()
    d3.select(svg)
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", c)
      .attr("stroke-width", 1.5)
      .attr("d", lineGen)
  }, [data, width, height, color])

  useEffect(() => {
    draw()
  }, [draw])

  return (
    <svg
      ref={ref}
      width={width}
      height={height}
      className={className}
      aria-hidden="true"
    />
  )
}
