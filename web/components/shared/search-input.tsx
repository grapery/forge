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
  placeholder = "Search...",
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
    <div className="relative">
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
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
