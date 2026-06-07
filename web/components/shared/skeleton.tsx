import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md bg-gradient-to-r from-secondary/60 via-secondary/30 to-secondary/60 border-glass-border bg-[length:200%_100%] animate-shimmer",
        className,
      )}
      {...props}
    />
  )
}

function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-glass-border bg-card p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-lg" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-24" />
        </div>
      </div>
    </div>
  )
}

function TableRowSkeleton({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-glass-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  )
}

function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-64 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
      <div className="overflow-x-auto rounded-md border border-glass-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-glass-border bg-secondary/40">
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <Skeleton className="h-3 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <TableRowSkeleton key={i} cols={cols} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <TableSkeleton />
    </div>
  )
}

export { Skeleton, StatCardSkeleton, TableRowSkeleton, TableSkeleton, PageSkeleton }
