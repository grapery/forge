"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { FileText, Plus, Pencil, Send, Check, X, Rocket, CopyPlus } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { promptTemplateApi } from "@/lib/api/admin"
import type { PromptTemplateDraft, PromptTemplateDraftRequest } from "@/lib/types"
import { AdminPage } from "@/components/layout/admin-page"
import { PageHeader } from "@/components/shared/page-header"
import { PageSkeleton } from "@/components/shared/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const emptyForm = {
  key: "",
  type: "chat" as PromptTemplateDraft["type"],
  systemTemplate: "",
  userTemplate: "",
  variablesSchema: JSON.stringify({ type: "object", properties: {} }, null, 2),
  outputSchema: JSON.stringify({ type: "object", properties: {} }, null, 2),
  modelConfig: JSON.stringify({ model: "gemini-2.5-flash", temperature: 0.3 }, null, 2),
}

export default function PromptTemplatesPage() {
  const t = useTranslations("promptTemplates")
  const [items, setItems] = useState<PromptTemplateDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<PromptTemplateDraft | null>(null)
  const [form, setForm] = useState(emptyForm)

  const load = useCallback(() => {
    promptTemplateApi.list({ page: 1, pageSize: 100 })
      .then((data) => setItems(data.items || []))
      .catch((error) => toast.error(error?.message || t("loadFailed")))
      .finally(() => setLoading(false))
  }, [t])

  useEffect(() => { load() }, [load])

  const counts = useMemo(() => items.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1
    return acc
  }, {}), [items])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  const openEdit = (item: PromptTemplateDraft) => {
    setEditing(item)
    setForm({
      key: item.key,
      type: item.type,
      systemTemplate: item.systemTemplate || "",
      userTemplate: item.userTemplate || "",
      variablesSchema: JSON.stringify(item.variablesSchema || {}, null, 2),
      outputSchema: JSON.stringify(item.outputSchema || {}, null, 2),
      modelConfig: JSON.stringify(item.modelConfig || {}, null, 2),
    })
    setOpen(true)
  }

  const save = async () => {
    try {
      const payload: PromptTemplateDraftRequest = {
        key: form.key.trim(), type: form.type,
        systemTemplate: form.systemTemplate, userTemplate: form.userTemplate,
        variablesSchema: JSON.parse(form.variablesSchema), outputSchema: JSON.parse(form.outputSchema),
        modelConfig: JSON.parse(form.modelConfig),
      }
      setSaving(true)
      if (editing) {
        const update = {
          type: payload.type,
          systemTemplate: payload.systemTemplate,
          userTemplate: payload.userTemplate,
          variablesSchema: payload.variablesSchema,
          outputSchema: payload.outputSchema,
          modelConfig: payload.modelConfig,
        }
        await promptTemplateApi.update(editing.id, { ...update, revision: editing.revision })
      } else {
        await promptTemplateApi.create(payload)
      }
      toast.success(t(editing ? "updated" : "created"))
      setOpen(false)
      load()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("saveFailed"))
    } finally {
      setSaving(false)
    }
  }

  const act = async (item: PromptTemplateDraft, action: "submit" | "approve" | "reject" | "publish") => {
    try {
      if (action === "submit") await promptTemplateApi.submit(item.id)
      if (action === "approve") await promptTemplateApi.review(item.id, "approved")
      if (action === "reject") await promptTemplateApi.review(item.id, "rejected")
      if (action === "publish") await promptTemplateApi.publish(item.id)
      toast.success(t("actionSucceeded"))
      load()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("actionFailed"))
    }
  }

	const cloneNextVersion = async (item: PromptTemplateDraft) => {
		try {
			setSaving(true)
			const cloned = await promptTemplateApi.cloneNextVersion(item.id)
			toast.success(t("versionCloned"))
			load()
			openEdit(cloned)
		} catch (error: unknown) {
			toast.error(error instanceof Error ? error.message : t("actionFailed"))
		} finally {
			setSaving(false)
		}
	}

  return (
    <AdminPage>
      <PageHeader title={t("title")} description={t("description")} icon={FileText} actions={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />{t("newPrompt")}</Button>} />

      <div className="grid gap-3 md:grid-cols-4">
        {(["draft", "reviewing", "approved", "released"] as const).map((status) => (
          <Card key={status}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{t(`status.${status}`)}</p><p className="mt-1 text-2xl font-medium">{counts[status] || 0}</p></CardContent></Card>
        ))}
      </div>

      {loading ? <PageSkeleton /> : <div className="grid gap-4 xl:grid-cols-2">
        {items.map((item) => <Card key={item.id}>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div><CardTitle>{item.key}</CardTitle><p className="mt-1 text-xs text-muted-foreground">v{item.version} · rev {item.revision} · {item.type}</p></div>
            <Badge variant="secondary">{t(`status.${item.status}`)}</Badge>
          </CardHeader>
          <CardContent>
            <p className="line-clamp-3 min-h-14 whitespace-pre-wrap text-sm text-muted-foreground">{item.systemTemplate || item.userTemplate}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(item.status === "draft" || item.status === "rejected") && <><Button size="sm" variant="outline" onClick={() => openEdit(item)}><Pencil className="mr-1 h-3.5 w-3.5" />{t("edit")}</Button><Button size="sm" variant="outline" onClick={() => act(item, "submit")}><Send className="mr-1 h-3.5 w-3.5" />{t("submit")}</Button></>}
              {item.status === "reviewing" && <><Button size="sm" variant="outline" onClick={() => act(item, "approve")}><Check className="mr-1 h-3.5 w-3.5" />{t("approve")}</Button><Button size="sm" variant="outline" onClick={() => act(item, "reject")}><X className="mr-1 h-3.5 w-3.5" />{t("reject")}</Button></>}
              {item.status === "approved" && <Button size="sm" onClick={() => act(item, "publish")}><Rocket className="mr-1 h-3.5 w-3.5" />{t("publish")}</Button>}
								{item.status === "released" && <Button size="sm" variant="outline" disabled={saving} onClick={() => cloneNextVersion(item)}><CopyPlus className="mr-1 h-3.5 w-3.5" />{t("newVersion")}</Button>}
              {item.releaseId && <span className="self-center text-xs text-muted-foreground">{item.releaseId}</span>}
            </div>
          </CardContent>
        </Card>)}
        {items.length === 0 && <p className="text-sm text-muted-foreground">{t("empty")}</p>}
      </div>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>{t(editing ? "editTitle" : "createTitle")}</DialogTitle><DialogDescription>{t("createDescription")}</DialogDescription></DialogHeader>
          <div className="grid gap-4">
            <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground"><p className="font-medium text-foreground">{t("runtimeVariablesTitle")}</p><p className="mt-1">{t("runtimeVariablesHelp")}</p></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>{t("key")}</Label><Input disabled={!!editing} value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="storyboard.bible.system" /></div><div><Label>{t("type")}</Label><Select value={form.type} onValueChange={(value: PromptTemplateDraft["type"]) => setForm({ ...form, type: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="chat">chat</SelectItem><SelectItem value="text">text</SelectItem><SelectItem value="image">image</SelectItem></SelectContent></Select></div></div>
            <div><Label>{t("systemTemplate")}</Label><Textarea className="min-h-40 font-mono text-xs" value={form.systemTemplate} onChange={(e) => setForm({ ...form, systemTemplate: e.target.value })} /></div>
            <div><Label>{t("userTemplate")}</Label><Textarea className="min-h-40 font-mono text-xs" value={form.userTemplate} onChange={(e) => setForm({ ...form, userTemplate: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>{t("variablesSchema")}</Label><Textarea className="min-h-36 font-mono text-xs" value={form.variablesSchema} onChange={(e) => setForm({ ...form, variablesSchema: e.target.value })} /></div><div><Label>{t("outputSchema")}</Label><Textarea className="min-h-36 font-mono text-xs" value={form.outputSchema} onChange={(e) => setForm({ ...form, outputSchema: e.target.value })} /></div></div>
            <div><Label>{t("modelConfig")}</Label><Textarea className="min-h-24 font-mono text-xs" value={form.modelConfig} onChange={(e) => setForm({ ...form, modelConfig: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button><Button disabled={saving || !form.key.trim() || (!form.systemTemplate.trim() && !form.userTemplate.trim())} onClick={save}>{saving ? t("saving") : t(editing ? "saveChanges" : "create")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  )
}
