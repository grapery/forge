"use client"

import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useCallback, useEffect, useState } from "react"

interface SearchInputProps {
  value?: string
  onSearch: (value: string) => void
  placeholder?: string
  debounceMs?: number
}

export function SearchInput({
  value: externalValue,
  onSearch,
  placeholder,
  debounceMs = 300,
}: SearchInputProps) {
  const [value, setValue] = useState(externalValue || "")

  useEffect(() => {
    if (externalValue !== undefined) setValue(externalValue)
  }, [externalValue])

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(value)
    }, debounceMs)
    return () => clearTimeout(timer)
  }, [value, debounceMs, onSearch])

  const handleClear = useCallback(() => {
    setValue("")
    onSearch("")
  }, [onSearch])

  return (
    <div className="relative transition-all duration-200 focus-within:shadow-glow focus-within:ring-1 focus-within:ring-primary/30 rounded-md">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-9"
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-opacity"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
