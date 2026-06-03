"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"

import { useSearchParams } from "next/navigation"

import { userApi } from "@/lib/api/admin"

import type { PlatformUser } from "@/lib/types"

import { PageHeader } from "@/components/shared/page-header"

import { StatCard } from "@/components/shared/stat-card"

import { Badge } from "@/components/ui/badge"

import { Button } from "@/components/ui/button"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"

import { ArrowLeft, BookOpen, Layers, Users, Shield, ShieldOff } from "lucide-react"

import { useRouter } from "next/navigation"

import { toast } from "sonner"


export default function UserDetailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const t = useTranslations("usersDetail")
  const id = searchParams.get("id")
  const [user, setUser] = useState<PlatformUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState<"suspend" | "activate" | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    userApi.get(id).then(setUser).catch(() => toast.error(t("toastNotFound"))).finally(() => setLoading(false))
  }, [id])

  const handleAction = async () => {
    if (!user || !action) return
    try {
      if (action === "suspend") {
        await userApi.suspend(user.id)
        toast.success(t("toastSuspended"))
      } else {
        await userApi.activate(user.id)
        toast.success(t("toastActivated"))
      }
      setAction(null)
      userApi.get(user.id).then(setUser)
    } catch (err: any) {
      toast.error(err.message || "Action failed")
    }
  }

  if (loading) return <PageSkeleton />
  if (!user) return <div className="py-12 text-center text-muted-foreground">{t("notFound")}</div>

  const formatTime = (ts: number | null) => ts ? new Date(ts * 1000).toLocaleString() : "-"

  return (
    <div className="space-y-6">
      <PageHeader
        title={user.displayName || user.username}
        description={user.email}
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />{t("buttonBack")}
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title={t("statStoryboards")} value={user.storyboardCount} icon={Layers} />
        <StatCard title={t("statFragments")} value={user.fragmentsCount} icon={BookOpen} />
        <StatCard title={t("statFollowers")} value={user.followers} icon={Users} />
        <StatCard title={t("statFollowing")} value={user.following} icon={Users} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("cardProfileInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">{t("fieldUsername")}</span><span>{user.username}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("fieldEmail")}</span><span>{user.email}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("fieldStatus")}</span><Badge variant={user.status === "active" ? "default" : "destructive"}>{user.status}</Badge></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("fieldPoints")}</span><span>{user.points}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("fieldJoined")}</span><span>{formatTime(user.createdAt)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("fieldLastLogin")}</span><span>{formatTime(user.lastLoginAt)}</span></div>
          {user.bio && <div className="pt-2"><span className="text-muted-foreground">{t("fieldBio")}</span><p className="mt-1">{user.bio}</p></div>}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        {user.status === "active" ? (
          <Button variant="destructive" onClick={() => setAction("suspend")}>
            <ShieldOff className="mr-2 h-4 w-4" />{t("buttonSuspendUser")}
          </Button>
        ) : (
          <Button onClick={() => setAction("activate")}>
            <Shield className="mr-2 h-4 w-4" />{t("buttonActivateUser")}
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={!!action}
        onOpenChange={(o) => { if (!o) setAction(null) }}
        title={action === "suspend" ? t("dialogSuspendTitle") : t("dialogActivateTitle")}
        description={t("dialogDescription", { action: action || "", username: user.username })}
        confirmLabel={action === "suspend" ? t("dialogConfirmSuspend") : t("dialogConfirmActivate")}
        variant={action === "suspend" ? "destructive" : "default"}
        onConfirm={handleAction}
      />
    </div>
  )
}
