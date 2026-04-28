import { Suspense } from "react"
import { AdminLayout } from "@/components/layout/admin-layout"

export default function AdminGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminLayout>
      <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Loading...</div>}>
        {children}
      </Suspense>
    </AdminLayout>
  )
}
