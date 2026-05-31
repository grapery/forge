"use client"

import { useEffect, useState } from "react"
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
  const id = searchParams.get("id")
  const [user, setUser] = useState<PlatformUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState<"suspend" | "activate" | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    userApi.get(id).then(setUser).catch(() => toast.error("User not found")).finally(() => setLoading(false))
  }, [id])

  const handleAction = async () => {
    if (!user || !action) return
    try {
      if (action === "suspend") {
        await userApi.suspend(user.id)
        toast.success("User suspended")
      } else {
        await userApi.activate(user.id)
        toast.success("User activated")
      }
      setAction(null)
      userApi.get(user.id).then(setUser)
    } catch (err: any) {
      toast.error(err.message || "Action failed")
    }
  }

  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading...</div>
  if (!user) return <div className="py-12 text-center text-muted-foreground">User not found</div>

  const formatTime = (ts: number | null) => ts ? new Date(ts * 1000).toLocaleString() : "-"

  return (
    <div className="space-y-6">
      <PageHeader
        title={user.displayName || user.username}
        description={user.email}
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />Back
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Storyboards" value={user.storyboardCount} icon={Layers} />
        <StatCard title="Fragments" value={user.fragmentsCount} icon={BookOpen} />
        <StatCard title="Followers" value={user.followers} icon={Users} />
        <StatCard title="Following" value={user.following} icon={Users} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Username</span><span>{user.username}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{user.email}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant={user.status === "active" ? "default" : "destructive"}>{user.status}</Badge></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Points</span><span>{user.points}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Joined</span><span>{formatTime(user.createdAt)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Last Login</span><span>{formatTime(user.lastLoginAt)}</span></div>
          {user.bio && <div className="pt-2"><span className="text-muted-foreground">Bio</span><p className="mt-1">{user.bio}</p></div>}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        {user.status === "active" ? (
          <Button variant="destructive" onClick={() => setAction("suspend")}>
            <ShieldOff className="mr-2 h-4 w-4" />Suspend User
          </Button>
        ) : (
          <Button onClick={() => setAction("activate")}>
            <Shield className="mr-2 h-4 w-4" />Activate User
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={!!action}
        onOpenChange={(o) => { if (!o) setAction(null) }}
        title={action === "suspend" ? "Suspend User" : "Activate User"}
        description={`Are you sure you want to ${action} "${user.username}"?`}
        confirmLabel={action === "suspend" ? "Suspend" : "Activate"}
        variant={action === "suspend" ? "destructive" : "default"}
        onConfirm={handleAction}
      />
    </div>
  )
}
