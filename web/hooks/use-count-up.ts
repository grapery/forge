"use client"

import { useEffect, useState, useRef } from "react"

interface UseCountUpOptions {
  end: number
  duration?: number
  delay?: number
  enabled?: boolean
}

export function useCountUp({ end, duration = 800, delay = 0, enabled = true }: UseCountUpOptions): number {
  const [value, setValue] = useState(enabled ? 0 : end)
  const startTime = useRef<number | null>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!enabled) {
      setValue(end)
      return
    }

    let cancelled = false

    const timeout = setTimeout(() => {
      const animate = (timestamp: number) => {
        if (cancelled) return
        if (startTime.current === null) startTime.current = timestamp
        const elapsed = timestamp - startTime.current
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setValue(Math.round(end * eased))

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate)
        }
      }
      rafRef.current = requestAnimationFrame(animate)
    }, delay)

    return () => {
      cancelled = true
      clearTimeout(timeout)
      cancelAnimationFrame(rafRef.current)
    }
  }, [end, duration, delay, enabled])

  return value
}
