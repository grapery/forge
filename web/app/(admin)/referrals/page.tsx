"use client"

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"

import { invitationApi } from "@/lib/api/admin"

import type { ReferralItem } from "@/lib/types"

import { PageHeader } from "@/components/shared/page-header"

import { DataTable } from "@/components/shared/data-table"

import { Badge } from "@/components/ui/badge"

import { Users, UserCheck } from "lucide-react"
import { AdminPage } from "@/components/layout/admin-page"


export default function ReferralsPage() {
  const t = useTranslations("referrals")
  const [items, setItems] = useState<ReferralItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const pageSize = 20

  const fetchData = useCallback(() => {
    setLoading(true)
    invitationApi
      .listReferrals({ page, pageSize })
      .then((data) => {
        setItems(data.items || [])
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const formatTime = (ts: number | null) => {
    if (!ts) return "-"
    return new Date(ts * 1000).toLocaleDateString()
  }

  return (
    <AdminPage>
      <PageHeader title={t("title")} description={t("description")} icon={UserCheck} />

      {loading ? (
        <PageSkeleton />
      ) : (
        <DataTable
          data={items}
          pagination={{ page, pageSize, total }}
          onPageChange={setPage}
          columns={[
            {
              key: "referrerName",
              header: t("columnReferrer"),
              render: (item: ReferralItem) => (
                <span className="text-sm font-medium">{item.referrerName}</span>
              ),
            },
            {
              key: "refereeName",
              header: t("columnReferee"),
              render: (item: ReferralItem) => (
                <span className="text-sm text-muted-foreground">{item.refereeName}</span>
              ),
            },
            {
              key: "referralCode",
              header: t("columnReferralCode"),
              render: (item: ReferralItem) => (
                <span className="font-mono text-sm">{item.referralCode}</span>
              ),
            },
            {
              key: "pointsEarned",
              header: t("columnPointsEarned"),
              render: (item: ReferralItem) => (
                <span className="text-sm">{item.pointsEarned}</span>
              ),
            },
            {
              key: "status",
              header: t("columnStatus"),
              render: (item: ReferralItem) => (
                <Badge variant={item.status === "completed" ? "default" : "secondary"}>
                  {item.status}
                </Badge>
              ),
            },
            {
              key: "createdAt",
              header: t("columnCreated"),
              render: (item: ReferralItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(item.createdAt)}</span>
              ),
            },
          ]}
        />
      )}
    </AdminPage>
  )
}
