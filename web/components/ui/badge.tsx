import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-border bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-[var(--status-danger-bg)] text-[var(--status-danger)]",
        outline: "border-border text-foreground",
        purple: "border-transparent bg-[var(--status-info-bg)] text-[var(--status-info)]",
        glass: "border-border bg-secondary text-foreground",
        green: "border-transparent bg-[var(--status-success-bg)] text-[var(--status-success)]",
        amber: "border-transparent bg-[var(--status-warning-bg)] text-[var(--status-warning)]",
        red: "border-transparent bg-[var(--status-danger-bg)] text-[var(--status-danger)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
