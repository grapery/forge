"use client"

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"

import { deviceApi } from "@/lib/api/admin"

import type { UserDeviceItem, DevicePlatformCount } from "@/lib/types"

import { PageHeader } from "@/components/shared/page-header"

import { DataTable } from "@/components/shared/data-table"

import { SearchInput } from "@/components/shared/search-input"

import { StatCard } from "@/components/shared/stat-card"

import { Badge } from "@/components/ui/badge"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { Smartphone } from "lucide-react"


export default function DevicesPage() {
  const t = useTranslations("devices")
  const [items, setItems] = useState<UserDeviceItem[]>([])
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState<DevicePlatformCount | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [platform, setPlatform] = useState("")
  const [isActive, setIsActive] = useState("")
  const pageSize = 20

  const fetchData = useCallback(() => {
    setLoading(true)
    deviceApi
      .list({
        page,
        pageSize,
        userId: search || undefined,
        platform: platform === "" || platform === "all" ? undefined : platform,
        isActive: isActive === "" ? undefined : isActive === "true",
      })
      .then((data) => {
        setItems(data.items || [])
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, search, platform, isActive])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    deviceApi.platformCounts().then(setCounts).catch(() => {})
  }, [])

  const formatTime = (ts: number | null) => {
    if (!ts) return "-"
    return new Date(ts * 1000).toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} icon={Smartphone} />

      {counts && (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard title={t("statIos")} value={counts.ios} icon={Smartphone} />
          <StatCard title={t("statAndroid")} value={counts.android} icon={Smartphone} />
          <StatCard title={t("statOther")} value={counts.other} icon={Smartphone} />
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="w-64">
          <SearchInput onSearch={setSearch} placeholder={t("searchPlaceholder")} />
        </div>
        <Select value={platform || "all"} onValueChange={(v) => setPlatform(v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("filterAllPlatforms")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAllPlatforms")}</SelectItem>
            <SelectItem value="ios">{t("filterIos")}</SelectItem>
            <SelectItem value="android">{t("filterAndroid")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={isActive || "all"} onValueChange={(v) => setIsActive(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("filterAllStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAllStatus")}</SelectItem>
            <SelectItem value="true">{t("filterActive")}</SelectItem>
            <SelectItem value="false">{t("filterInactive")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <PageSkeleton />
      ) : (
        <DataTable
          data={items}
          pagination={{ page, pageSize, total }}
          onPageChange={setPage}
          columns={[
            {
              key: "userName",
              header: t("columnUser"),
              render: (item: UserDeviceItem) => (
                <span className="text-sm font-medium">{item.userName}</span>
              ),
            },
            {
              key: "platform",
              header: t("columnPlatform"),
              render: (item: UserDeviceItem) => (
                <Badge variant={item.platform === "ios" ? "default" : "secondary"}>
                  {item.platform}
                </Badge>
              ),
            },
            {
              key: "deviceModel",
              header: t("columnDeviceModel"),
              render: (item: UserDeviceItem) => (
                <span className="text-sm text-muted-foreground">{item.deviceModel || "-"}</span>
              ),
            },
            {
              key: "osVersion",
              header: t("columnOsVersion"),
              render: (item: UserDeviceItem) => (
                <span className="text-sm text-muted-foreground">{item.osVersion || "-"}</span>
              ),
            },
            {
              key: "appVersion",
              header: t("columnAppVersion"),
              render: (item: UserDeviceItem) => (
                <span className="text-sm">{item.appVersion || "-"}</span>
              ),
            },
            {
              key: "isActive",
              header: t("columnActive"),
              render: (item: UserDeviceItem) => (
                <Badge variant={item.isActive ? "default" : "secondary"}>
                  {item.isActive ? t("filterActive") : t("filterInactive")}
                </Badge>
              ),
            },
            {
              key: "lastActiveAt",
              header: t("columnLastActive"),
              render: (item: UserDeviceItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(item.lastActiveAt)}</span>
              ),
            },
            {
              key: "createdAt",
              header: t("columnCreated"),
              render: (item: UserDeviceItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(item.createdAt)}</span>
              ),
            },
          ]}
        />
      )}
    </div>
  )
}
