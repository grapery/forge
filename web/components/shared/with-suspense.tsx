"use client"

import { Suspense } from "react"
import { PageSkeleton } from "@/components/shared/skeleton"

export function WithSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      {children}
    </Suspense>
  )
}
