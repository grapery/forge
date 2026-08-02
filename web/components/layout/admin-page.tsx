import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Consistent Notion-like page shell for list/detail admin pages. */
export function AdminPage({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn("space-y-6", className)}>{children}</div>
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
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {children}
    </div>
  )
}
