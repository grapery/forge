"use client"

import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useCountUp } from "@/hooks/use-count-up"

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: number
  trendLabel?: string
}

export function StatCard({ title, value, icon: Icon, trend, trendLabel }: StatCardProps) {
  const numericValue = typeof value === "number" ? value : 0
  const animatedValue = useCountUp({ end: numericValue, duration: 600 })

  return (
    <Card className="hover:bg-secondary/40 transition-colors">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{title}</p>
          <p className="text-xl font-medium tabular-nums tracking-tight">
            {typeof value === "number" ? animatedValue.toLocaleString() : value}
          </p>
          {trend !== undefined && (
            <div
              className={cn(
                "flex items-center gap-1 text-xs font-medium mt-0.5",
                trend >= 0 ? "text-[var(--status-success)]" : "text-[var(--status-danger)]",
              )}
            >
              {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trend >= 0 ? "+" : ""}
              {trend}%
              {trendLabel && <span className="text-muted-foreground font-normal ml-1">{trendLabel}</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
