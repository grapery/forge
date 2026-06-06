"use client"

import { useRef, useEffect, useCallback } from "react"
import * as d3 from "d3"
import { sankey as d3Sankey, sankeyLinkHorizontal } from "d3-sankey"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getThemeColors, SERIES_COLORS } from "./chart-theme"

interface SankeyNode {
  name: string
}

interface SankeyLink {
  source: string
  target: string
  value: number
}

interface SankeyChartProps {
  nodes: SankeyNode[]
  links: SankeyLink[]
  title?: string
  height?: number
  className?: string
}

export function SankeyChart({ nodes, links, title, height = 300, className }: SankeyChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const draw = useCallback(() => {
    const container = containerRef.current
    if (!container || nodes.length === 0 || links.length === 0) return

    const colors = getThemeColors()
    const rect = container.getBoundingClientRect()
    const W = Math.floor(rect.width)
    const H = height
    if (W <= 0 || H <= 0) return

    container.innerHTML = ""

    const svg = d3.select(container).append("svg").attr("width", W).attr("height", H)

    const nameMap = new Map(nodes.map((n, i) => [n.name, i]))
    const indexedLinks = links.map((l) => ({
      source: nameMap.get(l.source) ?? 0,
      target: nameMap.get(l.target) ?? 0,
      value: l.value,
    }))

    const sankeyLayout = d3Sankey<{ nodes: SankeyNode[]; links: typeof indexedLinks }, SankeyNode, typeof indexedLinks[0]>()
      .nodeWidth(16)
      .nodePadding(12)
      .extent([[1, 5], [W - 1, H - 5]])

    const graph = sankeyLayout({
      nodes: nodes.map((d) => ({ ...d })),
      links: indexedLinks.map((d) => ({ ...d })),
    } as any)

    const colorScale = d3.scaleOrdinal<string>()
      .domain(nodes.map((n) => n.name))
      .range(SERIES_COLORS as unknown as string[])

    svg.append("g")
      .selectAll("path")
      .data(graph.links)
      .join("path")
      .attr("d", sankeyLinkHorizontal() as any)
      .attr("fill", "none")
      .attr("stroke", (d: any) => colorScale((d.source as any).name) as string)
      .attr("stroke-opacity", 0.3)
      .attr("stroke-width", (d: any) => Math.max(1, d.width || 1))
      .on("mouseenter", function () {
        d3.select(this).attr("stroke-opacity", 0.6)
      })
      .on("mouseleave", function () {
        d3.select(this).attr("stroke-opacity", 0.3)
      })

    const node = svg.append("g")
      .selectAll("g")
      .data(graph.nodes)
      .join("g")

    node.append("rect")
      .attr("x", (d: any) => d.x0)
      .attr("y", (d: any) => d.y0)
      .attr("height", (d: any) => Math.max(1, d.y1 - d.y0))
      .attr("width", (d: any) => d.x1 - d.x0)
      .attr("fill", (d: any) => colorScale(d.name) as string)
      .attr("rx", 3)

    node.append("text")
      .attr("x", (d: any) => (d.x0 < W / 2 ? d.x1 + 6 : d.x0 - 6))
      .attr("y", (d: any) => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", (d: any) => (d.x0 < W / 2 ? "start" : "end"))
      .attr("fill", colors.text)
      .attr("font-size", "11px")
      .text((d: any) => `${d.name} (${d.value.toLocaleString()})`)
  }, [nodes, links, height])

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
