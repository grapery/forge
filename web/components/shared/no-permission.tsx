"use client"

import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ShieldOff } from "lucide-react"

export function NoPermission() {
  const t = useTranslations("common")
  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
        <ShieldOff className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold mb-2">{t("noPermission")}</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">{t("noPermissionDesc")}</p>
      <Button variant="outline" onClick={() => router.push("/dashboard")}>
        {t("backToDashboard")}
      </Button>
    </div>
  )
}
