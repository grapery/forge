"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"

import { characterApi } from "@/lib/api/admin"

import type { CharacterItem, CharacterStatusCount } from "@/lib/types"

import { PageHeader } from "@/components/shared/page-header"

import { DataTable } from "@/components/shared/data-table"

import { SearchInput } from "@/components/shared/search-input"

import { StatCard } from "@/components/shared/stat-card"

import { Badge } from "@/components/ui/badge"

import { Button } from "@/components/ui/button"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { Users, Eye, EyeOff, Trash2, Ghost } from "lucide-react"

import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { AdminPage } from "@/components/layout/admin-page"


export default function CharactersPage() {
  const router = useRouter()
  const t = useTranslations("characters")
  const [items, setItems] = useState<CharacterItem[]>([])
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState<CharacterStatusCount | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [isPublic, setIsPublic] = useState("")
  const pageSize = 20

  const [actionCharacter, setActionCharacter] = useState<CharacterItem | null>(null)
  const [actionType, setActionType] = useState<"unpublish" | "force_delete" | null>(null)

  const fetchData = useCallback(() => {
    setLoading(true)
    characterApi
      .list({ page, pageSize, search: search || undefined, isPublic: isPublic === "" ? undefined : isPublic === "true" })
      .then((data) => {
        setItems(data.items || [])
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, search, isPublic])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    characterApi.statusCounts().then(setCounts).catch(() => {})
  }, [])

  const handleAction = async () => {
    if (!actionCharacter || !actionType) return
    try {
      if (actionType === "unpublish") {
        await characterApi.action(actionCharacter.id, { action: "unpublish" })
        toast.success(t("toastUnpublished", { name: actionCharacter.name }))
      } else {
        await characterApi.action(actionCharacter.id, { action: "force_delete" })
        toast.success(t("toastDeleted", { name: actionCharacter.name }))
      }
      setActionCharacter(null)
      setActionType(null)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Action failed")
    }
  }

  const formatTime = (ts: number | null) => {
    if (!ts) return "-"
    return new Date(ts * 1000).toLocaleDateString()
  }

  return (
    <AdminPage>
      <PageHeader title={t("title")} description={t("description")} icon={Ghost} />

      {counts && (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard title={t("filterTotal")} value={counts.total} icon={Users} />
          <StatCard title={t("filterPublic")} value={counts.public} icon={Eye} />
          <StatCard title={t("filterPrivate")} value={counts.private} icon={EyeOff} />
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="w-64">
          <SearchInput onSearch={setSearch} placeholder={t("searchPlaceholder")} />
        </div>
        <Select value={isPublic || "all"} onValueChange={(v) => setIsPublic(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("filterAllVisibility")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAllVisibility")}</SelectItem>
            <SelectItem value="true">{t("filterPublic")}</SelectItem>
            <SelectItem value="false">{t("filterPrivate")}</SelectItem>
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
          onRowClick={(item) => router.push(`/characters/detail?id=${item.id}`)}
          columns={[
            {
              key: "name",
              header: t("columnName"),
              render: (c: CharacterItem) => (
                <span className="text-sm font-medium">{c.name}</span>
              ),
            },
            {
              key: "author",
              header: t("columnAuthor"),
              render: (c: CharacterItem) => (
                <span className="text-sm text-muted-foreground">{c.authorName}</span>
              ),
            },
            {
              key: "story",
              header: t("columnStory"),
              render: (c: CharacterItem) => (
                <span className="text-xs text-muted-foreground">{c.storyId || "-"}</span>
              ),
            },
            {
              key: "isPublic",
              header: t("columnPublic"),
              render: (c: CharacterItem) => (
                <Badge variant={c.isPublic ? "default" : "secondary"}>
                  {c.isPublic ? t("filterPublic") : t("filterPrivate")}
                </Badge>
              ),
            },
            {
              key: "likes",
              header: t("columnLikes"),
              render: (c: CharacterItem) => <span className="text-sm">{c.likes}</span>,
            },
            {
              key: "followers",
              header: t("columnFollowers"),
              render: (c: CharacterItem) => <span className="text-sm">{c.followers}</span>,
            },
            {
              key: "created",
              header: t("columnCreated"),
              render: (c: CharacterItem) => (
                <span className="text-xs text-muted-foreground">{formatTime(c.createdAt)}</span>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (c: CharacterItem) => (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={(e) => { e.stopPropagation(); setActionCharacter(c); setActionType("unpublish") }}
                  >
                    <EyeOff className="mr-1 h-3 w-3" />{t("buttonUnpublish")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={(e) => { e.stopPropagation(); setActionCharacter(c); setActionType("force_delete") }}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />{t("buttonDelete")}
                  </Button>
                </div>
              ),
            },
          ]}
        />
      )}

      <ConfirmDialog
        open={!!actionCharacter && !!actionType}
        onOpenChange={(o) => { if (!o) { setActionCharacter(null); setActionType(null) } }}
        title={actionType === "unpublish" ? t("dialogUnpublishTitle") : t("dialogDeleteTitle")}
        description={actionType === "unpublish" ? t("dialogUnpublishDescription", { name: actionCharacter?.name || "" }) : t("dialogDeleteDescription", { name: actionCharacter?.name || "" })}
        confirmLabel={actionType === "unpublish" ? t("dialogConfirmUnpublish") : t("buttonDelete")}
        variant="destructive"
        onConfirm={handleAction}
      />
    </AdminPage>
  )
}
