"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { NextIntlClientProvider } from "next-intl"

type Locale = "en" | "zh"

interface LocaleContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
}

const LocaleContext = createContext<LocaleContextType>({
  locale: "en",
  setLocale: () => {},
})

export const useLocale = () => useContext(LocaleContext)

const STORAGE_KEY = "forge_locale"

import enMessages from "@/messages/en.json"
import zhMessages from "@/messages/zh.json"

const messageMap: Record<Locale, any> = {
  en: enMessages,
  zh: zhMessages,
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
    if (stored && (stored === "en" || stored === "zh")) {
      setLocaleState(stored)
    }
    setMounted(true)
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem(STORAGE_KEY, newLocale)
  }, [])

  if (!mounted) return null

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={messageMap[locale]}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  )
}
