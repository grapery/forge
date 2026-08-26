"use client"

import { useCallback, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Shield } from "lucide-react"
import { safetyReviewApi } from "@/lib/api/admin"
import type { SafetyAssetItem, SafetyConversationItem } from "@/lib/types"
import { AdminPage } from "@/components/layout/admin-page"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageSkeleton } from "@/components/shared/skeleton"

export default function SafetyReviewPage() {
  const t = useTranslations("safetyReview")
  const [tab, setTab] = useState("assets")
  const [assets, setAssets] = useState<SafetyAssetItem[]>([])
  const [conversations, setConversations] = useState<SafetyConversationItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const page = 1
  const pageSize = 50
  const load = useCallback(() => {
    setLoading(true)
    if (tab === "assets") {
      safetyReviewApi.assets({ page, pageSize }).then((data) => { setTotal(data.total); setAssets(data.items || []) }).finally(() => setLoading(false))
    } else {
      safetyReviewApi.conversations({ page, pageSize }).then((data) => { setTotal(data.total); setConversations(data.items || []) }).finally(() => setLoading(false))
    }
  }, [tab])
  useEffect(() => { load() }, [load])
  const date = (ts: number) => ts ? new Date(ts * 1000).toLocaleString() : "-"
  return <AdminPage>
    <PageHeader title={t("title")} description={t("description")} icon={Shield} />
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList><TabsTrigger value="assets">{t("tabAssets")}</TabsTrigger><TabsTrigger value="conversations">{t("tabConversations")}</TabsTrigger></TabsList>
      <TabsContent value="assets">{loading ? <PageSkeleton /> : <DataTable data={assets} pagination={{ page, pageSize, total }} onPageChange={() => {}} columns={[
        { key: "name", header: t("columnName"), render: (x: SafetyAssetItem) => x.name },
        { key: "owner", header: t("columnOwner"), render: (x: SafetyAssetItem) => x.userName || x.userId },
        { key: "type", header: t("columnType"), render: (x: SafetyAssetItem) => `${x.type} · ${x.mimeType}` },
        { key: "created", header: t("columnCreated"), render: (x: SafetyAssetItem) => date(x.createdAt) },
      ]} />}</TabsContent>
      <TabsContent value="conversations">{loading ? <PageSkeleton /> : <DataTable data={conversations} pagination={{ page, pageSize, total }} onPageChange={() => {}} columns={[
        { key: "owner", header: t("columnOwner"), render: (x: SafetyConversationItem) => x.ownerUserName || x.ownerUserId },
        { key: "type", header: t("columnType"), render: (x: SafetyConversationItem) => x.sessionType },
        { key: "latest", header: t("columnLatest"), render: (x: SafetyConversationItem) => x.lastMessage },
        { key: "created", header: t("columnCreated"), render: (x: SafetyConversationItem) => date(x.lastMessageAt) },
      ]} />}</TabsContent>
    </Tabs>
  </AdminPage>
}
