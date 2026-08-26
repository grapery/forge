import { type ReactNode } from "react"
import { type LucideIcon } from "lucide-react"

interface PageHeaderProps {
  title: string
  description?: string
  icon?: LucideIcon
  actions?: ReactNode
}

export function PageHeader({ title, description, icon: Icon, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          {Icon && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary"><Icon className="h-4 w-4 text-muted-foreground" /></span>}
          <h1 className="text-2xl font-semibold tracking-tight text-foreground leading-tight sm:text-[28px]">{title}</h1>
        </div>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
