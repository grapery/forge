"use client"

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"

import { useSearchParams, useRouter } from "next/navigation"

import {
  userApi, membershipApi, tokenApi, contentApi, aiTaskApi, feedbackApi, orderApi, deviceApi, commentApi, reportApi, notificationApi,
} from "@/lib/api/admin"

import type {
  PlatformUser, MembershipItem, TokenTransactionItem,
  ContentItem, AITaskItem, Feedback, SubscriptionOrderItem, UserDeviceItem, CommentItem, Report, ContentReport, NotificationItem,
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

import { ArrowLeft, BookOpen, Layers, Users as UsersIcon, Shield, ShieldOff, Crown, Coins, Sparkles, FileText, RefreshCw, Pencil, RefreshCw as RenewIcon, XCircle, MessageSquare, MessageCircle, Receipt, Smartphone, Flag, Bell } from "lucide-react"

import { toast } from "sonner"


type AggregateTab = "memberships" | "tokens" | "content" | "aiTasks" | "feedback" | "comments" | "reports" | "orders" | "devices" | "notifications"
type ContentSubTab = "fragment" | "storyboard" | "story"


export default function UserDetailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const t = useTranslations("usersDetail")
  const tMemberships = useTranslations("memberships")
  const tTokens = useTranslations("tokens")
  const tContent = useTranslations("content")
  const tAITasks = useTranslations("aiTasks")
  const tFeedback = useTranslations("feedback")
  const tComments = useTranslations("comments")
  const tReports = useTranslations("reports")
  const tOrders = useTranslations("orders")
  const tDevices = useTranslations("devices")
  const tNotifications = useTranslations("notifications")
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
  const [feedbackItems, setFeedbackItems] = useState<Feedback[]>([])
  const [comments, setComments] = useState<CommentItem[]>([])
  const [reportsFiled, setReportsFiled] = useState<Report[]>([])
  const [reportsAgainst, setReportsAgainst] = useState<Report[]>([])
  const [contentReportsFiled, setContentReportsFiled] = useState<ContentReport[]>([])
  const [orders, setOrders] = useState<SubscriptionOrderItem[]>([])
  const [devices, setDevices] = useState<UserDeviceItem[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

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

  const loadFeedback = useCallback(() => {
    if (!id) return Promise.resolve()
    return feedbackApi.list({ userId: id, pageSize: 20 })
      .then((data) => setFeedbackItems(data.items || []))
      .catch(() => {})
  }, [id])

  const loadComments = useCallback(() => {
    if (!id) return Promise.resolve()
    return commentApi.list({ authorId: id, pageSize: 20 })
      .then((data) => setComments(data.items || []))
      .catch(() => {})
  }, [id])

  const loadReports = useCallback(() => {
    if (!id) return Promise.resolve()
    return Promise.all([
      reportApi.list({ reporterId: id, pageSize: 10 }).then((data) => setReportsFiled(data.items || [])).catch(() => {}),
      reportApi.list({ reportedId: id, pageSize: 10 }).then((data) => setReportsAgainst(data.items || [])).catch(() => {}),
      reportApi.listContent({ reporterId: id, pageSize: 10 }).then((data) => setContentReportsFiled(data.items || [])).catch(() => {}),
    ])
  }, [id])

  const loadOrders = useCallback(() => {
    if (!id) return Promise.resolve()
    return orderApi.list({ userId: id, pageSize: 20 })
      .then((data) => setOrders(data.items || []))
      .catch(() => {})
  }, [id])

  const loadDevices = useCallback(() => {
    if (!id) return Promise.resolve()
    return deviceApi.list({ userId: id, pageSize: 20 })
      .then((data) => setDevices(data.items || []))
      .catch(() => {})
  }, [id])

  const loadNotifications = useCallback(() => {
    if (!id) return Promise.resolve()
    return notificationApi.list({ userId: id, pageSize: 20 })
      .then((data) => setNotifications(data.items || []))
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
    else if (activeTab === "feedback") loadFeedback()
    else if (activeTab === "comments") loadComments()
    else if (activeTab === "reports") loadReports()
    else if (activeTab === "orders") loadOrders()
    else if (activeTab === "devices") loadDevices()
    else if (activeTab === "notifications") loadNotifications()
  }, [activeTab, contentSubTab, loadMemberships, loadTokens, loadContents, loadTasks, loadFeedback, loadComments, loadReports, loadOrders, loadDevices, loadNotifications])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      if (activeTab === "memberships") await loadMemberships()
      else if (activeTab === "tokens") await loadTokens()
      else if (activeTab === "content") await loadContents()
      else if (activeTab === "aiTasks") await loadTasks()
      else if (activeTab === "feedback") await loadFeedback()
      else if (activeTab === "comments") await loadComments()
      else if (activeTab === "reports") await loadReports()
      else if (activeTab === "orders") await loadOrders()
      else if (activeTab === "devices") await loadDevices()
      else if (activeTab === "notifications") await loadNotifications()
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/comments?authorId=${user.id}`)}>
              <MessageSquare className="mr-2 h-4 w-4" />{t("buttonViewComments")}
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />{t("buttonBack")}
            </Button>
          </div>
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
            <TabsTrigger value="feedback"><MessageSquare className="mr-1 h-3 w-3" />{t("tabFeedback")}</TabsTrigger>
            <TabsTrigger value="comments"><MessageCircle className="mr-1 h-3 w-3" />{t("tabComments")}</TabsTrigger>
            <TabsTrigger value="reports"><Flag className="mr-1 h-3 w-3" />{t("tabReports")}</TabsTrigger>
            <TabsTrigger value="orders"><Receipt className="mr-1 h-3 w-3" />{t("tabOrders")}</TabsTrigger>
            <TabsTrigger value="devices"><Smartphone className="mr-1 h-3 w-3" />{t("tabDevices")}</TabsTrigger>
            <TabsTrigger value="notifications"><Bell className="mr-1 h-3 w-3" />{t("tabNotifications")}</TabsTrigger>
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
                  { key: "amount", header: tTokens("columnAmount"), render: (tt: TokenTransactionItem) => <span className={tt.amount >= 0 ? "text-sm text-[var(--status-success)]" : "text-sm text-[var(--status-danger)]"}>{tt.amount}</span> },
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

        <TabsContent value="feedback">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("cardFeedback")}</CardTitle>
              <Button variant="outline" size="sm" onClick={() => router.push(`/feedback?userId=${user.id}`)}>
                {t("buttonViewAllFeedback")}
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable
                data={feedbackItems}
                pagination={{ page: 1, pageSize: 20, total: feedbackItems.length }}
                onPageChange={() => {}}
                onRowClick={(fb: Feedback) => router.push(`/feedback/detail?id=${fb.id}`)}
                columns={[
                  { key: "category", header: tFeedback("filterAllCategories"), render: (fb: Feedback) => <span className="text-sm">{fb.category}</span> },
                  { key: "status", header: tFeedback("statusReceived"), render: (fb: Feedback) => <Badge variant="outline">{fb.status}</Badge> },
                  { key: "content", header: t("cardFeedback"), render: (fb: Feedback) => <span className="text-sm line-clamp-2 max-w-[320px]">{fb.content}</span> },
                  { key: "createdAt", header: tContent("columnCreated"), render: (fb: Feedback) => <span className="text-xs text-muted-foreground">{new Date(fb.createdAt * 1000).toLocaleString()}</span> },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("cardComments")}</CardTitle>
              <Button variant="outline" size="sm" onClick={() => router.push(`/comments?authorId=${user.id}`)}>
                {t("buttonViewAllComments")}
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable
                data={comments}
                pagination={{ page: 1, pageSize: 20, total: comments.length }}
                onPageChange={() => {}}
                columns={[
                  { key: "content", header: tComments("columnContent"), render: (c: CommentItem) => <span className="text-sm line-clamp-2 max-w-[320px]" title={c.content}>{c.content}</span> },
                  { key: "targetType", header: tComments("columnTargetType"), render: (c: CommentItem) => <Badge variant="secondary">{c.targetType}</Badge> },
                  { key: "likes", header: tComments("columnLikes"), render: (c: CommentItem) => <span className="text-sm">{c.likes}</span> },
                  { key: "replies", header: tComments("columnReplies"), render: (c: CommentItem) => <span className="text-sm">{c.replyCount}</span> },
                  { key: "createdAt", header: tComments("columnCreated"), render: (c: CommentItem) => <span className="text-xs text-muted-foreground">{new Date(c.createdAt * 1000).toLocaleString()}</span> },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t("cardReportsFiled")}</CardTitle>
                <Button variant="outline" size="sm" onClick={() => router.push(`/reports?tab=users&keyword=${encodeURIComponent(user.id)}`)}>
                  {t("buttonViewAllReports")}
                </Button>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={reportsFiled}
                  pagination={{ page: 1, pageSize: 10, total: reportsFiled.length }}
                  onPageChange={() => {}}
                  onRowClick={(r: Report) => router.push(`/reports/detail?id=${r.id}`)}
                  columns={[
                    { key: "status", header: tReports("columnStatus"), render: (r: Report) => <Badge variant="outline">{r.status}</Badge> },
                    { key: "reported", header: tReports("columnTarget"), render: (r: Report) => <span className="text-sm">{r.reportedName || r.reportedId.slice(0, 8)}</span> },
                    { key: "reason", header: tReports("columnReason"), render: (r: Report) => <span className="text-sm line-clamp-2 max-w-[280px]">{r.reason}</span> },
                    { key: "createdAt", header: tReports("columnCreated"), render: (r: Report) => <span className="text-xs text-muted-foreground">{new Date(r.createdAt * 1000).toLocaleString()}</span> },
                  ]}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t("cardReportsAgainst")}</CardTitle>
                <Button variant="outline" size="sm" onClick={() => router.push(`/reports?tab=users&keyword=${encodeURIComponent(user.username || user.id)}`)}>
                  {t("buttonViewAllReports")}
                </Button>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={reportsAgainst}
                  pagination={{ page: 1, pageSize: 10, total: reportsAgainst.length }}
                  onPageChange={() => {}}
                  onRowClick={(r: Report) => router.push(`/reports/detail?id=${r.id}`)}
                  columns={[
                    { key: "status", header: tReports("columnStatus"), render: (r: Report) => (
                      <div className="flex gap-1">
                        <Badge variant="outline">{r.status}</Badge>
                        {r.isOverdue && <Badge variant="destructive">{tReports("slaOverdue")}</Badge>}
                      </div>
                    ) },
                    { key: "reporter", header: tReports("columnReporter"), render: (r: Report) => <span className="text-sm">{r.reporterName || r.reporterId.slice(0, 8)}</span> },
                    { key: "reason", header: tReports("columnReason"), render: (r: Report) => <span className="text-sm line-clamp-2 max-w-[280px]">{r.reason}</span> },
                    { key: "createdAt", header: tReports("columnCreated"), render: (r: Report) => <span className="text-xs text-muted-foreground">{new Date(r.createdAt * 1000).toLocaleString()}</span> },
                  ]}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t("cardContentReportsFiled")}</CardTitle>
                <Button variant="outline" size="sm" onClick={() => router.push(`/reports?tab=content&keyword=${encodeURIComponent(user.id)}`)}>
                  {t("buttonViewAllReports")}
                </Button>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={contentReportsFiled}
                  pagination={{ page: 1, pageSize: 10, total: contentReportsFiled.length }}
                  onPageChange={() => {}}
                  onRowClick={(r: ContentReport) => router.push(`/reports/content-detail?id=${r.id}`)}
                  columns={[
                    { key: "type", header: tReports("columnContentType"), render: (r: ContentReport) => <Badge variant="secondary">{r.contentType}</Badge> },
                    { key: "status", header: tReports("columnStatus"), render: (r: ContentReport) => <Badge variant="outline">{r.status}</Badge> },
                    { key: "reason", header: tReports("columnReason"), render: (r: ContentReport) => <span className="text-sm line-clamp-2 max-w-[280px]">{r.reason}</span> },
                    { key: "createdAt", header: tReports("columnCreated"), render: (r: ContentReport) => <span className="text-xs text-muted-foreground">{new Date(r.createdAt * 1000).toLocaleString()}</span> },
                  ]}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("cardOrders")}</CardTitle>
              <Button variant="outline" size="sm" onClick={() => router.push(`/orders?userId=${user.id}`)}>
                {t("buttonViewAllOrders")}
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable
                data={orders}
                pagination={{ page: 1, pageSize: 20, total: orders.length }}
                onPageChange={() => {}}
                onRowClick={(o: SubscriptionOrderItem) => router.push(`/orders/detail?id=${o.id}`)}
                columns={[
                  { key: "plan", header: tOrders("columnPlan"), render: (o: SubscriptionOrderItem) => <span className="text-sm">{o.planName || o.planId || "-"}</span> },
                  { key: "status", header: tOrders("columnStatus"), render: (o: SubscriptionOrderItem) => <Badge variant="outline">{o.status}</Badge> },
                  { key: "amount", header: tOrders("columnAmount"), render: (o: SubscriptionOrderItem) => <span className="text-sm">{o.currency} {o.amount}</span> },
                  { key: "payment", header: tOrders("columnPayment"), render: (o: SubscriptionOrderItem) => <span className="text-xs text-muted-foreground">{o.paymentMethod || "-"}</span> },
                  { key: "createdAt", header: tOrders("columnCreated"), render: (o: SubscriptionOrderItem) => <span className="text-xs text-muted-foreground">{new Date(o.createdAt * 1000).toLocaleString()}</span> },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("cardDevices")}</CardTitle>
              <Button variant="outline" size="sm" onClick={() => router.push(`/devices?userId=${user.id}`)}>
                {t("buttonViewAllDevices")}
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable
                data={devices}
                pagination={{ page: 1, pageSize: 20, total: devices.length }}
                onPageChange={() => {}}
                columns={[
                  { key: "platform", header: tDevices("columnPlatform"), render: (d: UserDeviceItem) => <Badge variant="outline">{d.platform}</Badge> },
                  { key: "model", header: tDevices("columnDeviceModel"), render: (d: UserDeviceItem) => <span className="text-sm">{d.deviceModel || "-"}</span> },
                  { key: "os", header: tDevices("columnOsVersion"), render: (d: UserDeviceItem) => <span className="text-xs text-muted-foreground">{d.osVersion || "-"}</span> },
                  { key: "app", header: tDevices("columnAppVersion"), render: (d: UserDeviceItem) => <span className="text-xs text-muted-foreground">{d.appVersion || "-"}</span> },
                  { key: "active", header: tDevices("columnActive"), render: (d: UserDeviceItem) => <Badge variant={d.isActive ? "default" : "secondary"}>{d.isActive ? tDevices("filterActive") : tDevices("filterInactive")}</Badge> },
                  { key: "lastActive", header: tDevices("columnLastActive"), render: (d: UserDeviceItem) => <span className="text-xs text-muted-foreground">{d.lastActiveAt ? new Date(d.lastActiveAt * 1000).toLocaleString() : "-"}</span> },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("cardNotifications")}</CardTitle>
              <Button variant="outline" size="sm" onClick={() => router.push(`/notifications?userId=${user.id}`)}>
                {t("buttonViewAllNotifications")}
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable
                data={notifications}
                pagination={{ page: 1, pageSize: 20, total: notifications.length }}
                onPageChange={() => {}}
                onRowClick={(n: NotificationItem) => {
                  if (n.type === "feedback_response" && n.link) {
                    try {
                      const url = new URL(n.link, "https://forge.local")
                      const feedbackId = url.searchParams.get("id") || url.searchParams.get("feedbackId")
                      if (feedbackId) {
                        router.push(`/feedback/detail?id=${feedbackId}`)
                        return
                      }
                    } catch {
                      // fall through
                    }
                  }
                  router.push(`/notifications?userId=${user.id}&type=${encodeURIComponent(n.type)}`)
                }}
                columns={[
                  { key: "type", header: tNotifications("columnType"), render: (n: NotificationItem) => <Badge variant="secondary">{n.type}</Badge> },
                  { key: "title", header: tNotifications("columnTitle"), render: (n: NotificationItem) => <span className="text-sm font-medium">{n.title}</span> },
                  { key: "content", header: tNotifications("columnContent"), render: (n: NotificationItem) => <span className="text-xs text-muted-foreground line-clamp-2 max-w-[320px]">{n.content}</span> },
                  { key: "read", header: tNotifications("columnRead"), render: (n: NotificationItem) => <Badge variant={n.read ? "default" : "secondary"}>{n.read ? tNotifications("readYes") : tNotifications("readNo")}</Badge> },
                  { key: "createdAt", header: tNotifications("columnCreated"), render: (n: NotificationItem) => <span className="text-xs text-muted-foreground">{new Date(n.createdAt * 1000).toLocaleString()}</span> },
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
