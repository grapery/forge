import { type LucideIcon, Inbox } from "lucide-react"

interface EmptyStateProps {
  icon?: LucideIcon
  title?: string
  description?: string
}

export function EmptyState({ icon: Icon = Inbox, title = "No data found", description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in-up">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-muted to-muted/50">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <p className="mt-4 text-sm font-medium text-muted-foreground">{title}</p>
      {description && <p className="mt-1 text-xs text-muted-foreground/70">{description}</p>}
    </div>
  )
}
