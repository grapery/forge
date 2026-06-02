import { Suspense } from "react"
import { AdminLayout } from "@/components/layout/admin-layout"
import { PageSkeleton } from "@/components/shared/skeleton"

export default function AdminGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminLayout>
      <Suspense fallback={<PageSkeleton />}>
        {children}
      </Suspense>
    </AdminLayout>
  )
}
