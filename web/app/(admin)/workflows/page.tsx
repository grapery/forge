"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Workflow, Plus, Send, Check, X, Rocket, Pencil, Link, CopyPlus } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

import { workflowApi } from "@/lib/api/admin"
import type { CreateWorkflowDraftRequest, WorkflowDraft } from "@/lib/types"
import { AdminPage } from "@/components/layout/admin-page"
import { PageHeader } from "@/components/shared/page-header"
import { PageSkeleton } from "@/components/shared/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const starterDefinition = JSON.stringify({
  inputSchema: { type: "object", properties: {} },
  outputSchema: { type: "object", properties: {} },
  nodes: [
    { id: "generate_storyboard", type: "activity", activity: "storyboard.ensure_draft" },
    { id: "generate_bible_plan", type: "activity", activity: "storyboard.generate_bible_plan", dependsOn: ["generate_storyboard"] },
    { id: "generate_scene_plan", type: "activity", activity: "storyboard.generate_scene_plan", dependsOn: ["generate_bible_plan"] },
    { id: "persist_storyboard_content", type: "persist", activity: "storyboard.persist_content", dependsOn: ["generate_scene_plan"] },
    { id: "generate_storyboard_images", type: "activity", activity: "storyboard.ensure_images", dependsOn: ["persist_storyboard_content"] },
  ],
}, null, 2)

const starterManifest = JSON.stringify({
  catalog: { title: "", summary: "", category: "creation" },
  supportedClients: ["voyager"],
}, null, 2)

const starterPromptBundle = JSON.stringify({}, null, 2)

export default function WorkflowsPage() {
  const t = useTranslations("workflows")
  const [items, setItems] = useState<WorkflowDraft[]>([])
	const [activeReleaseIds, setActiveReleaseIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
	const [editing, setEditing] = useState<WorkflowDraft | null>(null)
	const [bindingTarget, setBindingTarget] = useState<WorkflowDraft | null>(null)
  const [saving, setSaving] = useState(false)
	const [form, setForm] = useState({ key: "", name: "", description: "", manifest: starterManifest, definition: starterDefinition, promptBundle: starterPromptBundle })
	const [binding, setBinding] = useState({ surface: "voyager.storyboard", action: "generate", tenantId: "", priority: "100" })

  const load = useCallback(() => {
    workflowApi.list({ page: 1, pageSize: 100 })
      .then((data) => setItems(data.items || []))
      .catch((error) => toast.error(error?.message || t("loadFailed")))
      .finally(() => setLoading(false))
  }, [t])
	const loadBindings = useCallback(() => {
		workflowApi.listBindings({ surface: "voyager.storyboard", action: "generate" })
			.then((data) => setActiveReleaseIds(new Set(data.items?.[0] ? [data.items[0].release.id] : [])))
			.catch(() => setActiveReleaseIds(new Set()))
	}, [])

  useEffect(() => { load() }, [load])
	useEffect(() => { loadBindings() }, [loadBindings])

  const counts = useMemo(() => items.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1
    return acc
  }, {}), [items])

	const openCreate = () => {
		setEditing(null)
		setForm({ key: "", name: "", description: "", manifest: starterManifest, definition: starterDefinition, promptBundle: starterPromptBundle })
		setOpen(true)
	}

	const openEdit = (item: WorkflowDraft) => {
		setEditing(item)
		setForm({
			key: item.key,
			name: item.name,
			description: item.description || "",
			manifest: JSON.stringify(item.manifest || {}, null, 2),
			definition: JSON.stringify(item.definition, null, 2),
			promptBundle: JSON.stringify(item.promptBundle || {}, null, 2),
		})
		setOpen(true)
	}

	const save = async () => {
    try {
      const definition = JSON.parse(form.definition) as CreateWorkflowDraftRequest["definition"]
			const manifest = JSON.parse(form.manifest) as Record<string, unknown>
			const promptBundle = JSON.parse(form.promptBundle) as Record<string, string>
      setSaving(true)
			const payload = {
				key: form.key.trim(), name: form.name.trim(), description: form.description.trim(), manifest, definition,
				policies: editing?.policies || { maxDurationSeconds: 43200, maxParallelism: 4, maxAttempts: 3 },
				promptBundle,
			}
			if (editing) await workflowApi.update(editing.id, { ...payload, revision: editing.revision })
			else await workflowApi.create(payload)
			toast.success(t(editing ? "updated" : "created"))
      setOpen(false)
			setEditing(null)
      load()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("saveFailed"))
    } finally {
      setSaving(false)
    }
  }

	const publishAndBind = async () => {
		if (!bindingTarget) return
		try {
			setSaving(true)
			const releaseId = bindingTarget.releaseId || (await workflowApi.publish(bindingTarget.id)).id
			await workflowApi.bind({
				surface: binding.surface.trim(), action: binding.action.trim(), tenantId: binding.tenantId.trim() || undefined,
				workflowKey: bindingTarget.key, releaseId, priority: Number(binding.priority) || 0, enabled: true,
			})
			toast.success(t("publishedAndBound"))
			setBindingTarget(null)
			load()
			loadBindings()
		} catch (error: unknown) {
			toast.error(error instanceof Error ? error.message : t("actionFailed"))
		} finally {
			setSaving(false)
		}
	}

  const act = async (item: WorkflowDraft, action: "submit" | "approve" | "reject" | "publish") => {
    try {
      if (action === "submit") await workflowApi.submit(item.id)
      if (action === "approve") await workflowApi.review(item.id, "approved")
      if (action === "reject") await workflowApi.review(item.id, "rejected")
      if (action === "publish") await workflowApi.publish(item.id)
      toast.success(t("actionSucceeded"))
      load()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("actionFailed"))
    }
  }

	const cloneNextVersion = async (item: WorkflowDraft) => {
		try {
			setSaving(true)
			const cloned = await workflowApi.cloneNextVersion(item.id)
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
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Workflow}
        actions={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />{t("newWorkflow")}</Button>}
      />

      <div className="grid gap-3 md:grid-cols-4">
        {(["draft", "reviewing", "approved", "released"] as const).map((status) => (
          <Card key={status}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{t(`status.${status}`)}</p><p className="mt-1 text-2xl font-medium">{counts[status] || 0}</p></CardContent></Card>
        ))}
      </div>

      {loading ? <PageSkeleton /> : (
        <div className="grid gap-4 xl:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div><CardTitle>{item.name}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{item.key}:v{item.version} · rev {item.revision}</p></div>
				<div className="flex gap-2"><Badge variant="secondary">{t(`status.${item.status}`)}</Badge>{item.releaseId && activeReleaseIds.has(item.releaseId) && <Badge>{t("active")}</Badge>}</div>
              </CardHeader>
              <CardContent>
                <p className="min-h-10 text-sm text-muted-foreground">{item.description || t("noDescription")}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(item.status === "draft" || item.status === "rejected") && <Button size="sm" variant="outline" onClick={() => act(item, "submit")}><Send className="mr-1 h-3.5 w-3.5" />{t("submit")}</Button>}
									{(item.status === "draft" || item.status === "rejected") && <Button size="sm" variant="outline" onClick={() => openEdit(item)}><Pencil className="mr-1 h-3.5 w-3.5" />{t("edit")}</Button>}
                  {item.status === "reviewing" && <>
                    <Button size="sm" variant="outline" onClick={() => act(item, "approve")}><Check className="mr-1 h-3.5 w-3.5" />{t("approve")}</Button>
                    <Button size="sm" variant="outline" onClick={() => act(item, "reject")}><X className="mr-1 h-3.5 w-3.5" />{t("reject")}</Button>
                  </>}
									{(item.status === "approved" || item.status === "released") && <Button size="sm" onClick={() => setBindingTarget(item)}>{item.status === "approved" ? <Rocket className="mr-1 h-3.5 w-3.5" /> : <Link className="mr-1 h-3.5 w-3.5" />}{t(item.status === "approved" ? "publishAndBind" : "bind")}</Button>}
					{item.status === "released" && <Button size="sm" variant="outline" disabled={saving} onClick={() => cloneNextVersion(item)}><CopyPlus className="mr-1 h-3.5 w-3.5" />{t("newVersion")}</Button>}
                  {item.releaseId && <span className="self-center text-xs text-muted-foreground">{item.releaseId}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
          {items.length === 0 && <p className="text-sm text-muted-foreground">{t("empty")}</p>}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
					<DialogHeader><DialogTitle>{t(editing ? "editTitle" : "createTitle")}</DialogTitle><DialogDescription>{t("createDescription")}</DialogDescription></DialogHeader>
          <div className="grid gap-4">
							<div className="grid grid-cols-2 gap-3"><div><Label>{t("key")}</Label><Input disabled={!!editing} value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="storyboard_generation" /></div><div><Label>{t("name")}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div></div>
            <div><Label>{t("workflowDescription")}</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
							<div><Label>{t("manifest")}</Label><Textarea className="min-h-32 font-mono text-xs" value={form.manifest} onChange={(e) => setForm({ ...form, manifest: e.target.value })} /></div>
            <div><Label>{t("definition")}</Label><Textarea className="min-h-64 font-mono text-xs" value={form.definition} onChange={(e) => setForm({ ...form, definition: e.target.value })} /></div>
            <div><Label>{t("promptBundle")}</Label><Textarea className="min-h-28 font-mono text-xs" value={form.promptBundle} onChange={(e) => setForm({ ...form, promptBundle: e.target.value })} placeholder={'{"generate_storyboard:bible_plan":"ptv_...","generate_storyboard:scene_plan":"ptv_...","generate_storyboard:json_repair":"ptv_..."}'} /><p className="mt-1 text-xs text-muted-foreground">{t("promptBundleHelp")}</p></div>
          </div>
					<DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button><Button disabled={saving || !form.key.trim() || !form.name.trim()} onClick={save}>{saving ? t("saving") : t(editing ? "saveChanges" : "create")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

			<Dialog open={!!bindingTarget} onOpenChange={(value) => { if (!value) setBindingTarget(null) }}>
				<DialogContent>
					<DialogHeader><DialogTitle>{t("bindingTitle")}</DialogTitle><DialogDescription>{t("bindingDescription")}</DialogDescription></DialogHeader>
					<div className="grid gap-4">
						<div><Label>{t("surface")}</Label><Input value={binding.surface} onChange={(e) => setBinding({ ...binding, surface: e.target.value })} /></div>
						<div><Label>{t("action")}</Label><Input value={binding.action} onChange={(e) => setBinding({ ...binding, action: e.target.value })} /></div>
						<div className="grid grid-cols-2 gap-3"><div><Label>{t("tenantId")}</Label><Input value={binding.tenantId} onChange={(e) => setBinding({ ...binding, tenantId: e.target.value })} placeholder={t("globalBinding")} /></div><div><Label>{t("priority")}</Label><Input type="number" value={binding.priority} onChange={(e) => setBinding({ ...binding, priority: e.target.value })} /></div></div>
					</div>
					<DialogFooter><Button variant="outline" onClick={() => setBindingTarget(null)}>{t("cancel")}</Button><Button disabled={saving || !binding.surface.trim() || !binding.action.trim()} onClick={publishAndBind}>{saving ? t("saving") : t("confirmBinding")}</Button></DialogFooter>
				</DialogContent>
			</Dialog>
    </AdminPage>
  )
}
