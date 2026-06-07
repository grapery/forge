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
  const animatedValue = useCountUp({ end: numericValue, duration: 800 })

  return (
    <Card className="hover:shadow-glow transition-all duration-300 active:scale-[0.98]">
      <CardContent className="flex items-center gap-4 p-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/25 to-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tabular-nums">
            {typeof value === "number" ? animatedValue.toLocaleString() : value}
          </p>
          {trend !== undefined && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              trend >= 0 ? "text-emerald-400" : "text-red-400"
            )}>
              {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trend >= 0 ? "+" : ""}{trend}%
              {trendLabel && <span className="text-muted-foreground font-normal ml-1">{trendLabel}</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
