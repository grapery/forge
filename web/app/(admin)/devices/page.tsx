"use client"

import { useEffect, useState, useCallback } from "react"
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
      <PageHeader title="Devices" description="Manage user devices and push tokens" icon={Smartphone} />

      {counts && (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard title="iOS" value={counts.ios} icon={Smartphone} />
          <StatCard title="Android" value={counts.android} icon={Smartphone} />
          <StatCard title="Other" value={counts.other} icon={Smartphone} />
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="w-64">
          <SearchInput onSearch={setSearch} placeholder="Search by user ID..." />
        </div>
        <Select value={platform || "all"} onValueChange={(v) => setPlatform(v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Platforms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="ios">iOS</SelectItem>
            <SelectItem value="android">Android</SelectItem>
          </SelectContent>
        </Select>
        <Select value={isActive || "all"} onValueChange={(v) => setIsActive(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
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
              header: "User",
              render: (item: UserDeviceItem) => (
                <span className="text-sm font-medium">{item.userName}</span>
              ),
            },
            {
              key: "platform",
              header: "Platform",
              render: (item: UserDeviceItem) => (
                <Badge variant={item.platform === "ios" ? "default" : "secondary"}>
                  {item.platform}
                </Badge>
              ),
            },
            {
              key: "deviceModel",
              header: "Device Model",
              render: (item: UserDeviceItem) => (
                <span className="text-sm text-muted-foreground">{item.deviceModel || "-"}</span>
              ),
            },
            {
              key: "osVersion",
              header: "OS Version",
              render: (item: UserDeviceItem) => (
                <span className="text-sm text-muted-foreground">{item.osVersion || "-"}</span>
              ),
            },
            {
              key: "appVersion",
              header: "App Version",
              render: (item: UserDeviceItem) => (
                <span className="text-sm">{item.appVersion || "-"}</span>
              ),
            },
            {
              key: "isActive",
              header: "Active",
              render: (item: UserDeviceItem) => (
                <Badge variant={item.isActive ? "default" : "secondary"}>
                  {item.isActive ? "Yes" : "No"}
                </Badge>
              ),
            },
            {
              key: "lastActiveAt",
              header: "Last Active",
              render: (item: UserDeviceItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(item.lastActiveAt)}</span>
              ),
            },
            {
              key: "createdAt",
              header: "Created",
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
