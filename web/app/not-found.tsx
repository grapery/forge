"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

export default function NotFound() {
  const router = useRouter()
  const t = useTranslations("notFound")
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">{t("title")}</h1>
      <p className="text-muted-foreground">{t("description")}</p>
      <button
        onClick={() => router.push("/dashboard")}
        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
      >
        {t("buttonDashboard")}
      </button>
    </div>
  )
}
