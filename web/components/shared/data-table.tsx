"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { cn } from "@/lib/utils"

interface PaginationInfo {
  page: number
  pageSize: number
  total: number
}

interface DataTableProps<T> {
  data: T[]
  pagination: PaginationInfo
  onPageChange: (page: number) => void
  columns: {
    key: string
    header: string
    render: (item: T) => React.ReactNode
  }[]
  onRowClick?: (item: T) => void
}

export function DataTable<T>({
  data,
  pagination,
  onPageChange,
  columns,
  onRowClick,
}: DataTableProps<T>) {
  const totalPages = Math.ceil(pagination.total / pagination.pageSize)
  const t = useTranslations("common")

  return (
    <div className="animate-fade-in">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState />
                </td>
              </tr>
            ) : (
              data.map((item, idx) => (
                <tr
                  key={(item as any).id || idx}
                  className={cn(
                    "border-b transition-colors hover:bg-muted/50 animate-fade-in-up",
                    onRowClick && "cursor-pointer"
                  )}
                  style={{ animationDelay: `${idx * 30}ms` }}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      {col.render(item)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-4">
          <p className="text-sm text-muted-foreground">
            {t("showing", {
              from: (pagination.page - 1) * pagination.pageSize + 1,
              to: Math.min(pagination.page * pagination.pageSize, pagination.total),
              total: pagination.total,
            })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              {pagination.page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
