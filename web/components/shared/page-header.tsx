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
    <div className="flex items-start justify-between gap-4 pb-6">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          {Icon && <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />}
          <h1 className="text-[28px] font-medium tracking-tight text-foreground leading-tight">{title}</h1>
        </div>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
