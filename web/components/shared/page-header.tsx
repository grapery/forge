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
    <div className="flex items-center justify-between pb-6 animate-fade-in-down">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/25 to-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-heading">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
