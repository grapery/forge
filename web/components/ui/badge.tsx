import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-gradient-primary text-primary-foreground hover:opacity-90",
        secondary: "border-glass-border bg-secondary/60 backdrop-blur-sm text-secondary-foreground",
        destructive: "border-transparent bg-red-500/15 text-red-400",
        outline: "border-glass-border text-foreground",
        purple: "border-transparent bg-primary/15 text-primary",
        glass: "border-glass-border bg-secondary/40 backdrop-blur-sm text-foreground",
        green: "border-transparent bg-emerald-500/15 text-emerald-400",
        amber: "border-transparent bg-amber-500/15 text-amber-400",
        red: "border-transparent bg-red-500/15 text-red-400",
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
