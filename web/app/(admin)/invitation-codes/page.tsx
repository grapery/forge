"use client"

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"

import { invitationApi } from "@/lib/api/admin"

import type { InvitationCodeItem } from "@/lib/types"

import { PageHeader } from "@/components/shared/page-header"

import { DataTable } from "@/components/shared/data-table"

import { SearchInput } from "@/components/shared/search-input"

import { Badge } from "@/components/ui/badge"

import { Button } from "@/components/ui/button"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import { Input } from "@/components/ui/input"

import { Label } from "@/components/ui/label"

import { Ticket, ToggleLeft, ToggleRight, Mail } from "lucide-react"

import { toast } from "sonner"
import { AdminPage } from "@/components/layout/admin-page"


export default function InvitationCodesPage() {
  const t = useTranslations("invitationCodes")
  const tc = useTranslations("common")
  const [items, setItems] = useState<InvitationCodeItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [isActive, setIsActive] = useState("")
  const pageSize = 20

  const [createOpen, setCreateOpen] = useState(false)
  const [maxUses, setMaxUses] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [description, setDescription] = useState("")
  const [creating, setCreating] = useState(false)

  const fetchData = useCallback(() => {
    setLoading(true)
    invitationApi
      .listCodes({
        page,
        pageSize,
        createdBy: search || undefined,
        isActive: isActive === "" ? undefined : isActive === "true",
      })
      .then((data) => {
        setItems(data.items || [])
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, search, isActive])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCreate = async () => {
    setCreating(true)
    try {
      await invitationApi.createCode({
        maxUses: maxUses ? Number(maxUses) : undefined,
        expiresAt: expiresAt || undefined,
        description: description || undefined,
      })
      toast.success(t("toastCreated"))
      setCreateOpen(false)
      setMaxUses("")
      setExpiresAt("")
      setDescription("")
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Failed to create code")
    } finally {
      setCreating(false)
    }
  }

  const handleToggle = async (item: InvitationCodeItem) => {
    try {
      await invitationApi.toggleCode(item.id, !item.isActive)
      toast.success(t("toastToggled", { status: item.isActive ? t("filterInactive") : t("filterActive") }))
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Toggle failed")
    }
  }

  const formatTime = (ts: number | null) => {
    if (!ts) return "-"
    return new Date(ts * 1000).toLocaleDateString()
  }

  return (
    <AdminPage>
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Mail}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Ticket className="mr-2 h-4 w-4" />Create Code
          </Button>
        }
      />

      <div className="flex items-center gap-4">
        <div className="w-64">
          <SearchInput onSearch={setSearch} placeholder={t("searchPlaceholder")} />
        </div>
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
              key: "code",
              header: t("columnCode"),
              render: (item: InvitationCodeItem) => (
                <span className="font-mono text-sm font-medium">{item.code}</span>
              ),
            },
            {
              key: "createdByName",
              header: t("columnCreatedBy"),
              render: (item: InvitationCodeItem) => (
                <span className="text-sm text-muted-foreground">{item.createdByName}</span>
              ),
            },
            {
              key: "isActive",
              header: t("columnStatus"),
              render: (item: InvitationCodeItem) => (
                <Badge variant={item.isActive ? "default" : "secondary"}>
                  {item.isActive ? t("filterActive") : t("filterInactive")}
                </Badge>
              ),
            },
            {
              key: "maxUses",
              header: t("columnMaxUses"),
              render: (item: InvitationCodeItem) => (
                <span className="text-sm">{item.maxUses || t("labelUnlimited")}</span>
              ),
            },
            {
              key: "currentUses",
              header: t("columnCurrentUses"),
              render: (item: InvitationCodeItem) => (
                <span className="text-sm">{item.currentUses}</span>
              ),
            },
            {
              key: "expiresAt",
              header: t("columnExpires"),
              render: (item: InvitationCodeItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(item.expiresAt)}</span>
              ),
            },
            {
              key: "description",
              header: t("columnDescription"),
              render: (item: InvitationCodeItem) => (
                <span className="text-xs text-muted-foreground">{item.description || "-"}</span>
              ),
            },
            {
              key: "createdAt",
              header: t("columnCreated"),
              render: (item: InvitationCodeItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(item.createdAt)}</span>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (item: InvitationCodeItem) => (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); handleToggle(item) }}
                >
                  {item.isActive ? (
                    <><ToggleRight className="mr-1 h-3 w-3" />{t("buttonDeactivate")}</>
                  ) : (
                    <><ToggleLeft className="mr-1 h-3 w-3" />{t("buttonActivate")}</>
                  )}
                </Button>
              ),
            },
          ]}
        />
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dialogCreateTitle")}</DialogTitle>
            <DialogDescription>{t("dialogCreateDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="maxUses">{t("dialogFieldMaxUses")}</Label>
              <Input
                id="maxUses"
                type="number"
                placeholder={t("dialogPlaceholderMaxUses")}
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresAt">{t("dialogFieldExpiresAt")}</Label>
              <Input
                id="expiresAt"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t("dialogFieldDescription")}</Label>
              <Input
                id="description"
                type="text"
                placeholder={t("dialogPlaceholderDescription")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{tc("cancel")}</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? tc("processing") : t("buttonCreateCode")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  )
}
