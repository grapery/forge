"use client"

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"

import { useSearchParams, useRouter } from "next/navigation"

import {
  userApi, membershipApi, tokenApi, contentApi, aiTaskApi,
} from "@/lib/api/admin"

import type {
  PlatformUser, MembershipItem, TokenTransactionItem,
  ContentItem, AITaskItem,
} from "@/lib/types"

import { PageHeader } from "@/components/shared/page-header"

import { StatCard } from "@/components/shared/stat-card"

import { DataTable } from "@/components/shared/data-table"

import { Badge } from "@/components/ui/badge"

import { Button } from "@/components/ui/button"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { MembershipFormDialog } from "@/components/shared/membership-form-dialog"

import { ArrowLeft, BookOpen, Layers, Users as UsersIcon, Shield, ShieldOff, Crown, Coins, Sparkles, FileText, RefreshCw, Pencil, RefreshCw as RenewIcon, XCircle } from "lucide-react"

import { toast } from "sonner"


type AggregateTab = "memberships" | "tokens" | "content" | "aiTasks"
type ContentSubTab = "fragment" | "storyboard" | "story"


export default function UserDetailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const t = useTranslations("usersDetail")
  const tMemberships = useTranslations("memberships")
  const tTokens = useTranslations("tokens")
  const tContent = useTranslations("content")
  const tAITasks = useTranslations("aiTasks")
  const id = searchParams.get("id")
  const [user, setUser] = useState<PlatformUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState<"suspend" | "activate" | null>(null)

  const [activeTab, setActiveTab] = useState<AggregateTab>("memberships")
  const [contentSubTab, setContentSubTab] = useState<ContentSubTab>("fragment")

  const [memberships, setMemberships] = useState<MembershipItem[]>([])
  const [tokens, setTokens] = useState<TokenTransactionItem[]>([])
  const [contents, setContents] = useState<ContentItem[]>([])
  const [tasks, setTasks] = useState<AITaskItem[]>([])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    userApi.get(id).then(setUser).catch(() => toast.error(t("toastNotFound"))).finally(() => setLoading(false))
  }, [id, t])

  const loadMemberships = useCallback(() => {
    if (!id) return Promise.resolve()
    return membershipApi.list({ userId: id, pageSize: 10 })
      .then((data) => setMemberships(data.items || []))
      .catch(() => {})
  }, [id])

  const loadTokens = useCallback(() => {
    if (!id) return Promise.resolve()
    return tokenApi.list({ userId: id, pageSize: 10 })
      .then((data) => setTokens(data.items || []))
      .catch(() => {})
  }, [id])

  const loadContents = useCallback(() => {
    if (!id) return Promise.resolve()
    return contentApi.list({ authorId: id, contentType: contentSubTab, pageSize: 10 })
      .then((data) => setContents(data.items || []))
      .catch(() => {})
  }, [id, contentSubTab])

  const loadTasks = useCallback(() => {
    if (!id) return Promise.resolve()
    return aiTaskApi.list({ userId: id, pageSize: 10 })
      .then((data) => setTasks(data.items || []))
      .catch(() => {})
  }, [id])

  const [refreshing, setRefreshing] = useState(false)

  const [membershipEditTarget, setMembershipEditTarget] = useState<MembershipItem | "new" | null>(null)
  const [membershipRenewTarget, setMembershipRenewTarget] = useState<MembershipItem | null>(null)
  const [membershipCancelTarget, setMembershipCancelTarget] = useState<MembershipItem | null>(null)

  const activeMembership = memberships.find((m) => m.status === "active") || null

  useEffect(() => {
    if (activeTab === "memberships") loadMemberships()
    else if (activeTab === "tokens") loadTokens()
    else if (activeTab === "content") loadContents()
    else if (activeTab === "aiTasks") loadTasks()
  }, [activeTab, contentSubTab, loadMemberships, loadTokens, loadContents, loadTasks])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      if (activeTab === "memberships") await loadMemberships()
      else if (activeTab === "tokens") await loadTokens()
      else if (activeTab === "content") await loadContents()
      else if (activeTab === "aiTasks") await loadTasks()
    } finally {
      setRefreshing(false)
    }
  }

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
        <StatCard title={t("statFollowers")} value={user.followers} icon={UsersIcon} />
        <StatCard title={t("statFollowing")} value={user.following} icon={UsersIcon} />
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

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AggregateTab)}>
        <div className="flex items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="memberships"><Crown className="mr-1 h-3 w-3" />{t("tabMemberships")}</TabsTrigger>
            <TabsTrigger value="tokens"><Coins className="mr-1 h-3 w-3" />{t("tabTokens")}</TabsTrigger>
            <TabsTrigger value="content"><FileText className="mr-1 h-3 w-3" />{t("tabContent")}</TabsTrigger>
            <TabsTrigger value="aiTasks"><Sparkles className="mr-1 h-3 w-3" />{t("tabAITasks")}</TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="h-8">
            <RefreshCw className={`mr-1 h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? t("refreshing") : t("buttonRefresh")}
          </Button>
        </div>

        <TabsContent value="memberships">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{t("cardMemberships")}</span>
                <Button
                  size="sm"
                  variant={activeMembership ? "outline" : "default"}
                  onClick={() => setMembershipEditTarget(activeMembership || "new")}
                >
                  <Crown className="mr-1 h-3 w-3" />
                  {activeMembership ? tMemberships("buttonEdit") : tMemberships("buttonOpenMembership")}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={memberships}
                pagination={{ page: 1, pageSize: 10, total: memberships.length }}
                onPageChange={() => {}}
                columns={[
                  { key: "tier", header: tMemberships("columnTier"), render: (m: MembershipItem) => <Badge variant={m.tier === "premium" ? "default" : m.tier === "basic" ? "secondary" : "outline"}>{m.tier}</Badge> },
                  { key: "status", header: tMemberships("columnStatus"), render: (m: MembershipItem) => <Badge variant={m.status === "active" ? "default" : "secondary"}>{m.status}</Badge> },
                  { key: "tokens", header: tMemberships("columnTokens"), render: (m: MembershipItem) => <span className="text-sm">{m.tokenUsed}/{m.tokenQuota}</span> },
                  { key: "endDate", header: tMemberships("columnEndDate"), render: (m: MembershipItem) => <span className="text-xs text-muted-foreground">{m.endDate ? new Date(m.endDate * 1000).toLocaleDateString() : "-"}</span> },
                  { key: "autoRenew", header: tMemberships("columnAutoRenew"), render: (m: MembershipItem) => <Badge variant={m.autoRenew ? "default" : "secondary"}>{m.autoRenew ? "Yes" : "No"}</Badge> },
                  {
                    key: "actions",
                    header: "",
                    render: (m: MembershipItem) => (
                      <div className="flex gap-1">
                        {m.status === "active" && (
                          <>
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setMembershipEditTarget(m) }}>
                              <Pencil className="mr-1 h-3 w-3" />{tMemberships("buttonEdit")}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setMembershipRenewTarget(m) }}>
                              <RenewIcon className="mr-1 h-3 w-3" />{tMemberships("buttonRenew")}
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={(e) => { e.stopPropagation(); setMembershipCancelTarget(m) }}>
                              <XCircle className="mr-1 h-3 w-3" />{tMemberships("buttonCancelMembership")}
                            </Button>
                          </>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tokens">
          <Card>
            <CardHeader><CardTitle>{t("cardTokens")}</CardTitle></CardHeader>
            <CardContent>
              <DataTable
                data={tokens}
                pagination={{ page: 1, pageSize: 10, total: tokens.length }}
                onPageChange={() => {}}
                columns={[
                  { key: "type", header: tTokens("columnType"), render: (tt: TokenTransactionItem) => <Badge variant="outline">{tt.type}</Badge> },
                  { key: "amount", header: tTokens("columnAmount"), render: (tt: TokenTransactionItem) => <span className={tt.amount >= 0 ? "text-sm text-emerald-400" : "text-sm text-red-400"}>{tt.amount}</span> },
                  { key: "balance", header: tTokens("columnBalance"), render: (tt: TokenTransactionItem) => <span className="text-sm">{tt.balance}</span> },
                  { key: "description", header: tTokens("columnDescription"), render: (tt: TokenTransactionItem) => <span className="text-xs text-muted-foreground max-w-[200px] truncate block">{tt.description || "-"}</span> },
                  { key: "createdAt", header: tTokens("columnCreated"), render: (tt: TokenTransactionItem) => <span className="text-xs text-muted-foreground">{new Date(tt.createdAt * 1000).toLocaleString()}</span> },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{t("cardContent")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={contentSubTab} onValueChange={(v) => setContentSubTab(v as ContentSubTab)}>
                <TabsList className="mb-4">
                  <TabsTrigger value="fragment">{tContent("tabFragments")}</TabsTrigger>
                  <TabsTrigger value="storyboard">{tContent("tabStoryboards")}</TabsTrigger>
                  <TabsTrigger value="story">{tContent("tabStories")}</TabsTrigger>
                </TabsList>
                <DataTable
                  data={contents}
                  pagination={{ page: 1, pageSize: 10, total: contents.length }}
                  onPageChange={() => {}}
                  onRowClick={(item: ContentItem) => {
                    if (item.contentType === "fragment") router.push(`/fragments/detail?id=${item.id}`)
                    else if (item.contentType === "storyboard") router.push(`/storyboards/detail?id=${item.id}`)
                    else router.push(`/content/detail?id=${item.id}&type=story`)
                  }}
                  columns={[
                    { key: "title", header: tContent("columnTitle"), render: (c: ContentItem) => <span className="text-sm font-medium max-w-[260px] truncate block">{c.title || "-"}</span> },
                    { key: "status", header: tContent("columnStatus"), render: (c: ContentItem) => <Badge variant="outline">{c.status}</Badge> },
                    { key: "engagement", header: tContent("columnEngagement"), render: (c: ContentItem) => <span className="text-xs text-muted-foreground">{tContent("likesComments", { likes: c.likes, comments: c.comments })}</span> },
                    { key: "createdAt", header: tContent("columnCreated"), render: (c: ContentItem) => <span className="text-xs text-muted-foreground">{new Date(c.createdAt * 1000).toLocaleString()}</span> },
                  ]}
                />
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aiTasks">
          <Card>
            <CardHeader><CardTitle>{t("cardAITasks")}</CardTitle></CardHeader>
            <CardContent>
              <DataTable
                data={tasks}
                pagination={{ page: 1, pageSize: 10, total: tasks.length }}
                onPageChange={() => {}}
                onRowClick={(task: AITaskItem) => router.push(`/ai-tasks/detail?id=${task.id}`)}
                columns={[
                  { key: "type", header: tAITasks("columnType"), render: (task: AITaskItem) => <span className="text-sm font-medium">{task.type}</span> },
                  { key: "status", header: tAITasks("columnStatus"), render: (task: AITaskItem) => <Badge variant={task.status === "completed" ? "default" : task.status === "failed" ? "destructive" : "outline"}>{task.status}</Badge> },
                  { key: "provider", header: tAITasks("columnProvider"), render: (task: AITaskItem) => <span className="text-xs text-muted-foreground">{task.provider || "-"}</span> },
                  { key: "progress", header: tAITasks("columnProgress"), render: (task: AITaskItem) => <span className="text-sm">{task.progress != null ? `${task.progress}%` : "-"}</span> },
                  { key: "createdAt", header: tAITasks("columnCreated"), render: (task: AITaskItem) => <span className="text-xs text-muted-foreground">{new Date(task.createdAt * 1000).toLocaleString()}</span> },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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

      <MembershipFormDialog
        mode="upsert"
        open={!!membershipEditTarget}
        onOpenChange={(o) => { if (!o) setMembershipEditTarget(null) }}
        userId={id || ""}
        initial={membershipEditTarget === "new" ? null : membershipEditTarget}
        onSubmitted={loadMemberships}
      />

      <MembershipFormDialog
        mode="renew"
        open={!!membershipRenewTarget}
        onOpenChange={(o) => { if (!o) setMembershipRenewTarget(null) }}
        userId={id || ""}
        membershipId={membershipRenewTarget?.id}
        onSubmitted={loadMemberships}
      />

      <MembershipFormDialog
        mode="cancel"
        open={!!membershipCancelTarget}
        onOpenChange={(o) => { if (!o) setMembershipCancelTarget(null) }}
        userId={id || ""}
        membershipId={membershipCancelTarget?.id}
        onSubmitted={loadMemberships}
      />
    </div>
  )
}
