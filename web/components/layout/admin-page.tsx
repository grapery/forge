import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Shared task-focused page shell for Forge operational pages. */
export function AdminPage({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn("min-w-0 space-y-5 lg:space-y-6", className)}>{children}</div>
}

/** Quiet filter toolbar row. */
export function AdminToolbar({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/70 p-3 shadow-sm", className)}>
      {children}
    </div>
  )
}
