"use client"

import { useRef, useState, useCallback, type ReactNode } from "react"
import { useResizeObserver, type Dimensions } from "./use-resize-observer"
import { useChartSvg, type Margin, type ChartDimensions } from "./use-chart-svg"

const DEFAULT_MARGIN: Margin = { top: 16, right: 16, bottom: 32, left: 48 }

interface ChartBaseProps {
  height: number
  margin?: Margin
  className?: string
  ariaLabel: string
  children: (svg: SVGSVGElement, dims: ChartDimensions) => void
}

export function ChartBase({ height, margin = DEFAULT_MARGIN, className, ariaLabel, children }: ChartBaseProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState<Dimensions>({ width: 0, height })

  const handleResize = useCallback((newDims: Dimensions) => {
    setDims((prev) => {
      if (prev.width === newDims.width) return prev
      return { ...newDims, height }
    })
  }, [height])

  useResizeObserver(containerRef, handleResize)

  const handleReady = useCallback(
    (svg: SVGSVGElement, chartDims: ChartDimensions) => {
      children(svg, chartDims)
    },
    [children],
  )

  useChartSvg(containerRef, margin, handleReady, dims.width, dims.height)

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height }}
      role="img"
      aria-label={ariaLabel}
    />
  )
}

export type { Margin, ChartDimensions }
