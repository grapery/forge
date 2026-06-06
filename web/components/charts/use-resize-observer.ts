"use client"

import { useEffect, useRef, useCallback, type RefObject } from "react"

export interface Dimensions {
  width: number
  height: number
}

export function useResizeObserver(
  ref: RefObject<HTMLElement | null>,
  onResize: (dims: Dimensions) => void,
) {
  const onResizeRef = useRef(onResize)
  onResizeRef.current = onResize

  const observerRef = useRef<ResizeObserver | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    observerRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          onResizeRef.current({ width: Math.floor(width), height: Math.floor(height) })
        }
      }
    })

    observerRef.current.observe(el)
    return () => observerRef.current?.disconnect()
  }, [ref])

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    if (width > 0 && height > 0) {
      onResizeRef.current({ width: Math.floor(width), height: Math.floor(height) }
    )
    }
  }, [ref])

  return { measure }
}
