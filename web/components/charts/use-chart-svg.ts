"use client"

import { useEffect, useRef, type RefObject } from "react"
import * as d3 from "d3"

export interface Margin {
  top: number
  right: number
  bottom: number
  left: number
}

export interface ChartDimensions {
  width: number
  height: number
  innerWidth: number
  innerHeight: number
  margin: Margin
}

export function useChartSvg(
  containerRef: RefObject<HTMLDivElement | null>,
  margin: Margin,
  onReady: (svg: SVGSVGElement, dims: ChartDimensions) => void,
  containerWidth: number,
  containerHeight: number,
) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  useEffect(() => {
    const container = containerRef.current
    if (!container || containerWidth === 0 || containerHeight === 0) return

    const width = containerWidth
    const height = containerHeight
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    if (innerWidth <= 0 || innerHeight <= 0) return

    let svg = svgRef.current
    if (!svg || svg.parentElement !== container) {
      container.innerHTML = ""
      svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
      svg.setAttribute("width", String(width))
      svg.setAttribute("height", String(height))
      svg.style.display = "block"
      container.appendChild(svg)
      svgRef.current = svg

      d3.select(svg).append("g").attr("class", "chart-content").attr("transform", `translate(${margin.left},${margin.top})`)
    } else {
      svg.setAttribute("width", String(width))
      svg.setAttribute("height", String(height))
    }

    const dims: ChartDimensions = { width, height, innerWidth, innerHeight, margin }
    onReadyRef.current(svg, dims)
  }, [containerRef, margin, containerWidth, containerHeight])
}
