"use client"

import { Suspense } from "react"

export function WithSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Loading...</div>}>
      {children}
    </Suspense>
  )
}
