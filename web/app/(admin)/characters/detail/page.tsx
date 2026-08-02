"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { PageSkeleton } from "@/components/shared/skeleton"

import { useSearchParams } from "next/navigation"

import { characterApi } from "@/lib/api/admin"

import { PageHeader } from "@/components/shared/page-header"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { Badge } from "@/components/ui/badge"

import { Button } from "@/components/ui/button"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"

import { ArrowLeft, Eye, Trash2 } from "lucide-react"

import { useRouter } from "next/navigation"

import { toast } from "sonner"
import { AdminPage } from "@/components/layout/admin-page"


export default function CharacterDetailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const t = useTranslations("characterDetail")
  const id = searchParams.get("id")
  const [detail, setDetail] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    characterApi.get(id).then(setDetail).catch(() => toast.error("Character not found")).finally(() => setLoading(false))
  }, [id])

  const handleAction = async () => {
    if (!id || !action) return
    try {
      await characterApi.action(id, { action })
      toast.success(action === "unpublish" ? "Character unpublished" : "Character deleted")
      setAction(null)
      router.back()
    } catch (err: any) {
      toast.error(err.message || "Action failed")
    }
  }

  if (loading) return <PageSkeleton />
  if (!detail) return <div className="py-12 text-center text-muted-foreground">Character not found</div>

  const formatTime = (ts: any) => {
    if (!ts) return "-"
    if (typeof ts === "string") {
      const d = new Date(ts)
      if (!isNaN(d.getTime())) return d.toLocaleString()
    }
    const num = typeof ts === "number" ? ts : Number(ts)
    if (isNaN(num)) return String(ts)
    const ms = num > 1e12 ? num : num * 1000
    return new Date(ms).toLocaleString()
  }

  const overviewFields = [
    { label: "ID", value: detail.id },
    { label: "Name", value: detail.name },
    { label: "Story ID", value: detail.story_id },
    { label: "Author ID", value: detail.author_id || detail.creator_id || detail.user_id },
    { label: "Avatar URL", value: detail.avatar_url },
    { label: "Poster URL", value: detail.poster_url },
    { label: "Portrait URL", value: detail.portrait_url },
    { label: "Portrait Status", value: detail.portrait_status },
    { label: "Is Public", value: detail.is_public !== undefined ? String(detail.is_public) : undefined },
    { label: "Source Type", value: detail.source_type },
    { label: "Likes", value: detail.likes },
    { label: "Comments", value: detail.comments },
    { label: "Shares", value: detail.shares },
    { label: "Followers", value: detail.followers },
    { label: "Stories", value: detail.stories },
    { label: "Created At", value: formatTime(detail.created_at) },
    { label: "Updated At", value: formatTime(detail.updated_at) },
  ].filter(f => f.value !== undefined && f.value !== null && f.value !== "")

  const longTextFields = [
    { key: "personality", label: "Personality" },
    { key: "background", label: "Background" },
    { key: "appearance", label: "Appearance" },
    { key: "dress_preference", label: "Dress Preference" },
    { key: "handling_style", label: "Handling Style" },
    { key: "cognition_range", label: "Cognition Range" },
    { key: "short_term_goal", label: "Short-term Goal" },
    { key: "long_term_goal", label: "Long-term Goal" },
  ]

  return (
    <AdminPage>
      <PageHeader
        title={detail.name || "Character Detail"}
        description={`Character — ${detail.id?.slice(0, 8)}...`}
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />Back
          </Button>
        }
      />

      <Card>
        <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
        <CardContent className="grid gap-3 text-sm">
          {overviewFields.map((f) => (
            <div key={f.label} className="flex justify-between py-1 border-b last:border-0">
              <span className="text-muted-foreground">{f.label}</span>
              {f.label === "Is Public" ? (
                <Badge variant={f.value === "true" ? "default" : "secondary"}>{String(f.value)}</Badge>
              ) : f.label === "Portrait Status" ? (
                <Badge variant={f.value === "completed" || f.value === "active" ? "default" : "secondary"}>{String(f.value)}</Badge>
              ) : (
                <span className="text-right max-w-[60%] truncate">{String(f.value)}</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {detail.description && (
        <Card>
          <CardHeader><CardTitle>Description</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{String(detail.description)}</p>
          </CardContent>
        </Card>
      )}

      {longTextFields.map(({ key, label }) =>
        detail[key] ? (
          <Card key={key}>
            <CardHeader><CardTitle>{label}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{String(detail[key])}</p>
            </CardContent>
          </Card>
        ) : null
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setAction("unpublish")}>
          <Eye className="mr-2 h-4 w-4" />Unpublish
        </Button>
        <Button variant="destructive" onClick={() => setAction("force_delete")}>
          <Trash2 className="mr-2 h-4 w-4" />Delete
        </Button>
      </div>

      <ConfirmDialog
        open={!!action}
        onOpenChange={(o) => { if (!o) setAction(null) }}
        title={action === "unpublish" ? "Unpublish Character" : "Delete Character"}
        description={action === "unpublish"
          ? "Are you sure you want to unpublish this character? This action can be reversed."
          : "Are you sure you want to permanently delete this character? This action cannot be undone."}
        confirmLabel={action === "unpublish" ? "Unpublish" : "Delete"}
        variant={action === "force_delete" ? "destructive" : "default"}
        onConfirm={handleAction}
      />
    </AdminPage>
  )
}
