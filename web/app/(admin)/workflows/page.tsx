"use client"

import { useCallback, useEffect, useMemo, useState, type DragEvent } from "react"
import { Workflow, Plus, Send, Check, X, Rocket, Pencil, Link, CopyPlus, GripVertical, Sparkles, ImageIcon, Save, Trash2, ArrowLeft, ArrowDown, ArrowUp, CircleCheck, CircleDashed, Clock3, Layers3, Settings2 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

import { workflowApi } from "@/lib/api/admin"
import type { CreateWorkflowDraftRequest, WorkflowDraft, WorkflowNode } from "@/lib/types"
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

type NodeTemplate = {
  id: string
  activity: string
  type: "activity" | "persist"
  titleKey: string
  descriptionKey: string
  required?: boolean
  icon: "sparkles" | "save" | "image"
}

type CanvasNode = NodeTemplate & { note: string }

type WorkflowSettings = {
  maxDurationHours: string
  maxParallelism: string
  maxAttempts: string
}

const nodeTemplates: NodeTemplate[] = [
  { id: "generate_storyboard", activity: "storyboard.ensure_draft", type: "activity", titleKey: "nodePrepareTitle", descriptionKey: "nodePrepareDescription", required: true, icon: "sparkles" },
  { id: "generate_bible_plan", activity: "storyboard.generate_bible_plan", type: "activity", titleKey: "nodeBibleTitle", descriptionKey: "nodeBibleDescription", required: true, icon: "sparkles" },
  { id: "generate_scene_plan", activity: "storyboard.generate_scene_plan", type: "activity", titleKey: "nodeSceneTitle", descriptionKey: "nodeSceneDescription", required: true, icon: "sparkles" },
  { id: "persist_storyboard_content", activity: "storyboard.persist_content", type: "persist", titleKey: "nodePersistTitle", descriptionKey: "nodePersistDescription", required: true, icon: "save" },
  { id: "generate_storyboard_images", activity: "storyboard.ensure_images", type: "activity", titleKey: "nodeImagesTitle", descriptionKey: "nodeImagesDescription", icon: "image" },
]

const requiredActivities = nodeTemplates.filter((node) => node.required).map((node) => node.activity)
const defaultCanvas = (): CanvasNode[] => nodeTemplates.map((node) => ({ ...node, note: "" }))
const defaultSettings = (): WorkflowSettings => ({ maxDurationHours: "12", maxParallelism: "4", maxAttempts: "3" })

function nodeIcon(icon: NodeTemplate["icon"]) {
  if (icon === "save") return Save
  if (icon === "image") return ImageIcon
  return Sparkles
}

function canvasFromDefinition(definition: WorkflowDraft["definition"]): CanvasNode[] {
  return definition.nodes.flatMap((node) => {
    const template = nodeTemplates.find((item) => item.activity === node.activity)
    if (!template) return []
    return [{ ...template, id: node.id, note: typeof node.config?.operatorNote === "string" ? node.config.operatorNote : "" }]
  })
}

function definitionFromCanvas(nodes: CanvasNode[]): WorkflowDraft["definition"] {
  return {
    inputSchema: { type: "object", properties: {} },
    outputSchema: { type: "object", properties: {} },
    nodes: nodes.map((node, index): WorkflowNode => ({
      id: node.id,
      type: node.type,
      activity: node.activity,
      dependsOn: index === 0 ? [] : [nodes[index - 1].id],
      config: node.note.trim() ? { operatorNote: node.note.trim() } : undefined,
    })),
  }
}

function workflowManifest(source: Record<string, unknown> | undefined, name: string, description: string) {
  const existing = source || {}
  const catalog = typeof existing.catalog === "object" && existing.catalog !== null && !Array.isArray(existing.catalog)
    ? existing.catalog as Record<string, unknown>
    : {}
  return {
    ...existing,
    catalog: { ...catalog, title: name, summary: description, category: catalog.category || "creation" },
    supportedClients: Array.isArray(existing.supportedClients) && existing.supportedClients.length > 0 ? existing.supportedClients : ["voyager"],
  }
}

function hasExecutableStoryboardPath(nodes: CanvasNode[]) {
  return requiredActivities.every((activity, index) => nodes[index]?.activity === activity)
}

function settingsFromPolicies(policies?: WorkflowDraft["policies"]): WorkflowSettings {
  return {
    maxDurationHours: String((policies?.maxDurationSeconds ?? 43200) / 3600),
    maxParallelism: String(policies?.maxParallelism ?? 4),
    maxAttempts: String(policies?.maxAttempts ?? 3),
  }
}

function policiesFromSettings(settings: WorkflowSettings): NonNullable<WorkflowDraft["policies"]> {
  return {
    maxDurationSeconds: Math.round(Number(settings.maxDurationHours) * 3600),
    maxParallelism: Number(settings.maxParallelism),
    maxAttempts: Number(settings.maxAttempts),
  }
}

function hasValidSettings(settings: WorkflowSettings) {
  const durationHours = Number(settings.maxDurationHours)
  const maxParallelism = Number(settings.maxParallelism)
  const maxAttempts = Number(settings.maxAttempts)
  return Number.isFinite(durationHours) && durationHours > 0 && durationHours <= 12
    && Number.isInteger(maxParallelism) && maxParallelism >= 1 && maxParallelism <= 32
    && Number.isInteger(maxAttempts) && maxAttempts >= 1 && maxAttempts <= 10
}

export default function WorkflowsPage() {
  const t = useTranslations("workflows")
  const [items, setItems] = useState<WorkflowDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<WorkflowDraft | null>(null)
  const [bindingTarget, setBindingTarget] = useState<WorkflowDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ key: "", name: "", description: "", manifest: {} as Record<string, unknown>, nodes: defaultCanvas(), promptBundle: {} as Record<string, string>, settings: defaultSettings() })
  const [binding, setBinding] = useState({ surface: "voyager.storyboard", action: "generate", tenantId: "", priority: "100" })
  const [draggedNodeID, setDraggedNodeID] = useState<string | null>(null)
  const [selectedNodeID, setSelectedNodeID] = useState<string | null>(null)
  const [activeReleaseIds, setActiveReleaseIds] = useState<Set<string>>(new Set())

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
  const selectedNode = form.nodes.find((node) => node.id === selectedNodeID) || null
  const availableNodes = nodeTemplates.filter((template) => !form.nodes.some((node) => node.activity === template.activity))
  const workflowReady = hasExecutableStoryboardPath(form.nodes) && hasValidSettings(form.settings)
  const detailsReady = Boolean(form.key.trim() && form.name.trim())
  const builderReady = detailsReady && workflowReady
  const configuredNodeCount = form.nodes.filter((node) => node.note.trim()).length

  const openCreate = () => {
    setEditing(null)
    setForm({ key: "", name: "", description: "", manifest: {}, nodes: defaultCanvas(), promptBundle: {}, settings: defaultSettings() })
    setSelectedNodeID("generate_storyboard")
    setOpen(true)
  }
  const openEdit = (item: WorkflowDraft) => {
    setEditing(item)
    const nodes = canvasFromDefinition(item.definition)
    setForm({ key: item.key, name: item.name, description: item.description || "", manifest: item.manifest || {}, nodes, promptBundle: item.promptBundle || {}, settings: settingsFromPolicies(item.policies) })
    setSelectedNodeID(nodes[0]?.id || null)
    setOpen(true)
  }

  const updateNode = (nodeID: string, updates: Partial<CanvasNode>) => {
    setForm((current) => ({ ...current, nodes: current.nodes.map((node) => node.id === nodeID ? { ...node, ...updates } : node) }))
  }
  const appendNode = (template: NodeTemplate) => {
    setForm((current) => ({ ...current, nodes: [...current.nodes, { ...template, note: "" }] }))
    setSelectedNodeID(template.id)
  }
  const removeNode = (nodeID: string) => {
    const node = form.nodes.find((item) => item.id === nodeID)
    if (node?.required) return
    setForm((current) => ({ ...current, nodes: current.nodes.filter((item) => item.id !== nodeID) }))
    setSelectedNodeID(form.nodes.find((item) => item.id !== nodeID)?.id || null)
  }
  const moveNode = (sourceID: string, targetID: string) => {
    if (sourceID === targetID) return
    setForm((current) => {
      const sourceIndex = current.nodes.findIndex((node) => node.id === sourceID)
      const targetIndex = current.nodes.findIndex((node) => node.id === targetID)
      if (sourceIndex < 0 || targetIndex < 0) return current
      const reordered = [...current.nodes]
      const [source] = reordered.splice(sourceIndex, 1)
      reordered.splice(targetIndex, 0, source)
      return { ...current, nodes: reordered }
    })
  }
  const moveNodeByOffset = (nodeID: string, offset: -1 | 1) => {
    const sourceIndex = form.nodes.findIndex((node) => node.id === nodeID)
    const target = form.nodes[sourceIndex + offset]
    if (target) moveNode(nodeID, target.id)
  }
  const onDrop = (event: DragEvent<HTMLElement>, targetID?: string) => {
    event.preventDefault()
    const activity = event.dataTransfer.getData("application/x-workflow-activity")
    const sourceID = event.dataTransfer.getData("application/x-workflow-node")
    if (activity) {
      const template = nodeTemplates.find((node) => node.activity === activity)
      if (template && !form.nodes.some((node) => node.activity === activity)) appendNode(template)
    } else if (sourceID && targetID) {
      moveNode(sourceID, targetID)
    }
    setDraggedNodeID(null)
  }

  const save = async () => {
    if (!workflowReady) {
      toast.error(t("invalidStoryboardPath"))
      return
    }
    try {
      setSaving(true)
      const payload: CreateWorkflowDraftRequest = {
        key: form.key.trim(), name: form.name.trim(), description: form.description.trim(),
        manifest: workflowManifest(form.manifest, form.name.trim(), form.description.trim()),
        definition: definitionFromCanvas(form.nodes),
        policies: policiesFromSettings(form.settings),
        promptBundle: form.promptBundle,
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
      await workflowApi.bind({ surface: binding.surface.trim(), action: binding.action.trim(), tenantId: binding.tenantId.trim() || undefined, workflowKey: bindingTarget.key, releaseId, priority: Number(binding.priority) || 0, enabled: true })
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
    } catch (error: unknown) { toast.error(error instanceof Error ? error.message : t("actionFailed")) }
  }
  const cloneNextVersion = async (item: WorkflowDraft) => {
    try {
      setSaving(true)
      const cloned = await workflowApi.cloneNextVersion(item.id)
      toast.success(t("versionCloned"))
      load()
      openEdit(cloned)
    } catch (error: unknown) { toast.error(error instanceof Error ? error.message : t("actionFailed")) }
    finally { setSaving(false) }
  }

  const bindingDialog = <Dialog open={!!bindingTarget} onOpenChange={(value) => { if (!value) setBindingTarget(null) }}><DialogContent><DialogHeader><DialogTitle>{t("bindingTitle")}</DialogTitle><DialogDescription>{t("bindingDescription")}</DialogDescription></DialogHeader><div className="grid gap-4"><div><Label>{t("surface")}</Label><Input value={binding.surface} onChange={(event) => setBinding({ ...binding, surface: event.target.value })} /></div><div><Label>{t("action")}</Label><Input value={binding.action} onChange={(event) => setBinding({ ...binding, action: event.target.value })} /></div><div className="grid grid-cols-2 gap-3"><div><Label>{t("tenantId")}</Label><Input value={binding.tenantId} onChange={(event) => setBinding({ ...binding, tenantId: event.target.value })} placeholder={t("globalBinding")} /></div><div><Label>{t("priority")}</Label><Input type="number" value={binding.priority} onChange={(event) => setBinding({ ...binding, priority: event.target.value })} /></div></div></div><DialogFooter><Button variant="outline" onClick={() => setBindingTarget(null)}>{t("cancel")}</Button><Button disabled={saving || !binding.surface.trim() || !binding.action.trim()} onClick={publishAndBind}>{saving ? t("saving") : t("confirmBinding")}</Button></DialogFooter></DialogContent></Dialog>

  if (open) {
    return <AdminPage className="-mx-2 -mt-2 space-y-0">
      <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
        <header className="flex flex-col gap-4 border-b border-border bg-background/95 px-5 py-4 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Button size="icon" variant="ghost" aria-label={t("backToWorkflows")} onClick={() => setOpen(false)}><ArrowLeft className="h-4 w-4" /></Button>
            <div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t("builderEyebrow")}</p><h1 className="truncate text-xl font-semibold tracking-tight">{editing ? t("editTitle") : t("createTitle")}</h1></div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pl-12 md:pl-0"><div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${builderReady ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>{builderReady ? <CircleCheck className="h-3.5 w-3.5" /> : <CircleDashed className="h-3.5 w-3.5" />}{builderReady ? t("readyToSave") : t("incompleteSetup")}</div><Button variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button><Button disabled={saving || !builderReady} onClick={save}><Save className="mr-2 h-4 w-4" />{saving ? t("saving") : t(editing ? "saveChanges" : "create")}</Button></div>
        </header>

        <div className="grid xl:grid-cols-[290px_minmax(430px,1fr)_350px]">
          <aside className="border-b border-border bg-[#fbfbfa] p-5 xl:border-b-0 xl:border-r">
            <section><div className="mb-4 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-background">1</span><div><h2 className="text-sm font-semibold">{t("workflowDetails")}</h2><p className="text-xs text-muted-foreground">{t("workflowDetailsHelp")}</p></div></div><div className="space-y-4"><div><Label htmlFor="workflow-key">{t("key")}</Label><Input id="workflow-key" className="mt-1.5 bg-background" disabled={!!editing} value={form.key} onChange={(event) => setForm({ ...form, key: event.target.value })} placeholder="storyboard_generation" /></div><div><Label htmlFor="workflow-name">{t("name")}</Label><Input id="workflow-name" className="mt-1.5 bg-background" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={t("namePlaceholder")} /></div><div><Label htmlFor="workflow-description">{t("workflowDescription")}</Label><Textarea id="workflow-description" className="mt-1.5 min-h-24 bg-background" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder={t("descriptionPlaceholder")} /></div></div></section>
            <div className="my-6 border-t border-border" />
            <section><div className="mb-4 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-[11px] font-semibold">2</span><div><h2 className="text-sm font-semibold">{t("settingsTableTitle")}</h2><p className="text-xs text-muted-foreground">{t("executionPolicyHelp")}</p></div></div><div className="space-y-3"><div className="rounded-lg border border-border bg-background p-3"><div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-muted-foreground" /><Label htmlFor="workflow-duration" className="text-xs">{t("maxDuration")}</Label></div><Input id="workflow-duration" className="mt-2" type="number" min="1" max="12" step="0.5" value={form.settings.maxDurationHours} onChange={(event) => setForm((current) => ({ ...current, settings: { ...current.settings, maxDurationHours: event.target.value } }))} /><p className="mt-1 text-[11px] text-muted-foreground">{t("maxDurationHelp")}</p></div><div className="grid grid-cols-2 gap-2"><div className="rounded-lg border border-border bg-background p-3"><Label htmlFor="workflow-parallelism" className="text-xs">{t("maxParallelism")}</Label><Input id="workflow-parallelism" className="mt-2" type="number" min="1" max="32" step="1" value={form.settings.maxParallelism} onChange={(event) => setForm((current) => ({ ...current, settings: { ...current.settings, maxParallelism: event.target.value } }))} /></div><div className="rounded-lg border border-border bg-background p-3"><Label htmlFor="workflow-attempts" className="text-xs">{t("maxAttempts")}</Label><Input id="workflow-attempts" className="mt-2" type="number" min="1" max="10" step="1" value={form.settings.maxAttempts} onChange={(event) => setForm((current) => ({ ...current, settings: { ...current.settings, maxAttempts: event.target.value } }))} /></div></div></div></section>
          </aside>

          <main onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event)} className="min-h-[720px] border-b border-border bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.045),_transparent_42%)] px-5 py-6 xl:border-b-0">
            <div className="mx-auto max-w-2xl"><div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t("canvasKicker")}</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">{t("sequenceTitle")}</h2><p className="mt-1 max-w-lg text-sm text-muted-foreground">{t("sequenceHelp")}</p></div><Badge variant={workflowReady ? "secondary" : "outline"}>{workflowReady ? t("pathReady") : t("pathNeedsAttention")}</Badge></div>
              {availableNodes.length > 0 && <div className="mb-5 rounded-xl border border-dashed border-border bg-background/80 p-3"><p className="mb-2 text-xs font-medium text-muted-foreground">{t("optionalNodes")}</p><div className="flex flex-wrap gap-2">{availableNodes.map((node) => { const Icon = nodeIcon(node.icon); return <button key={node.id} draggable onDragStart={(event) => { event.dataTransfer.setData("application/x-workflow-activity", node.activity); setDraggedNodeID(node.id) }} onClick={() => appendNode(node)} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-xs transition-colors hover:border-primary/50 hover:bg-secondary"><Icon className="h-3.5 w-3.5 text-primary" /><span className="font-medium">{t(node.titleKey)}</span><Plus className="h-3.5 w-3.5 text-muted-foreground" /></button> })}</div></div>}
              <div className="mb-2 flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background"><CircleCheck className="h-3.5 w-3.5 text-emerald-600" /></span><span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{t("workflowStart")}</span></div>
              <div className="space-y-0">{form.nodes.map((node, index) => { const Icon = nodeIcon(node.icon); const isSelected = selectedNodeID === node.id; return <div key={node.id} className="relative grid grid-cols-[28px_minmax(0,1fr)] gap-3"><div className="flex flex-col items-center"><div className={`mt-6 h-2.5 w-2.5 rounded-full border-2 ${isSelected ? "border-primary bg-primary" : "border-muted-foreground/40 bg-background"}`} /><div className="min-h-10 w-px flex-1 bg-border" /></div><div draggable onDragStart={(event) => { event.dataTransfer.setData("application/x-workflow-node", node.id); setDraggedNodeID(node.id) }} onDragEnd={() => setDraggedNodeID(null)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, node.id)} onClick={() => setSelectedNodeID(node.id)} className={`mb-3 cursor-pointer rounded-xl border bg-background p-4 transition-all ${isSelected ? "border-primary shadow-[0_8px_30px_rgba(15,23,42,0.08)] ring-1 ring-primary/10" : "border-border hover:border-primary/40 hover:shadow-sm"} ${draggedNodeID === node.id ? "opacity-45" : ""}`}><div className="flex items-start gap-3"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}><Icon className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[11px] font-semibold text-muted-foreground">{String(index + 1).padStart(2, "0")}</span><h3 className="text-sm font-semibold">{t(node.titleKey)}</h3>{node.required && <Badge variant="outline" className="h-5 text-[10px]">{t("required")}</Badge>}</div><p className="mt-1 text-xs leading-5 text-muted-foreground">{t(node.descriptionKey)}</p>{node.note.trim() && <p className="mt-3 rounded-md bg-muted/55 px-3 py-2 text-xs leading-5 text-foreground">{node.note}</p>}</div><div className="flex shrink-0 items-center gap-1"><Button size="icon" variant="ghost" className="h-8 w-8 cursor-grab" aria-label={t("dragNode")}><GripVertical className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="h-8 w-8" disabled={index === 0} aria-label={t("moveUp")} onClick={(event) => { event.stopPropagation(); moveNodeByOffset(node.id, -1) }}><ArrowUp className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" className="h-8 w-8" disabled={index === form.nodes.length - 1} aria-label={t("moveDown")} onClick={(event) => { event.stopPropagation(); moveNodeByOffset(node.id, 1) }}><ArrowDown className="h-3.5 w-3.5" /></Button>{!node.required && <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={t("removeNode")} onClick={(event) => { event.stopPropagation(); removeNode(node.id) }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}</div></div></div></div> })}</div>
              {form.nodes.length === 0 && <div className="rounded-xl border border-dashed border-border bg-background/70 px-6 py-16 text-center"><Workflow className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-3 text-sm font-medium">{t("dropNodeHere")}</p><p className="mt-1 text-xs text-muted-foreground">{t("dropNodeHereHelp")}</p></div>}
              <div className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background"><CircleDashed className="h-3.5 w-3.5 text-muted-foreground" /></span><span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{t("workflowFinish")}</span></div>
            </div>
          </main>

          <aside className="bg-background p-5 xl:border-l xl:border-border"><div className="mb-5 flex items-center gap-2"><Settings2 className="h-4 w-4 text-muted-foreground" /><div><h2 className="text-sm font-semibold">{t("inspectorTitle")}</h2><p className="text-xs text-muted-foreground">{t("inspectorHelp")}</p></div></div>{selectedNode ? <section className="rounded-xl border border-border p-4"><div className="flex items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">{(() => { const Icon = nodeIcon(selectedNode.icon); return <Icon className="h-4 w-4" /> })()}</div><div><h3 className="text-sm font-semibold">{t(selectedNode.titleKey)}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{t(selectedNode.descriptionKey)}</p></div></div><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-lg bg-muted/55 p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{t("stepOrder")}</p><p className="mt-1 text-sm font-medium">{form.nodes.findIndex((node) => node.id === selectedNode.id) + 1}</p></div><div className="rounded-lg bg-muted/55 p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{t("stepDependency")}</p><p className="mt-1 truncate text-sm font-medium">{form.nodes.findIndex((node) => node.id === selectedNode.id) === 0 ? t("noDependency") : t(form.nodes[form.nodes.findIndex((node) => node.id === selectedNode.id) - 1].titleKey)}</p></div></div><Label htmlFor="node-operating-note" className="mt-5 block">{t("nodeNote")}</Label><Textarea id="node-operating-note" className="mt-2 min-h-44 resize-y" value={selectedNode.note} onChange={(event) => updateNode(selectedNode.id, { note: event.target.value })} placeholder={t("nodeNotePlaceholder")} /><p className="mt-2 text-xs leading-5 text-muted-foreground">{t("guidancePrompts")}</p><div className="mt-4 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-900"><Layers3 className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{t("savedAsConfig")}</span></div></section> : <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{t("selectNode")}</div>}
            <section className="mt-5 rounded-xl border border-border p-4"><h3 className="text-sm font-semibold">{t("reviewTitle")}</h3><p className="mt-1 text-xs text-muted-foreground">{t("reviewHelp")}</p><div className="mt-4 space-y-3">{[[detailsReady, t("checkDetails")], [hasExecutableStoryboardPath(form.nodes), t("checkSequence")], [hasValidSettings(form.settings), t("checkPolicy")]].map(([ready, label]) => <div key={String(label)} className="flex items-center gap-2 text-xs">{ready ? <CircleCheck className="h-4 w-4 text-emerald-600" /> : <CircleDashed className="h-4 w-4 text-amber-600" />}<span className={ready ? "text-foreground" : "text-muted-foreground"}>{label}</span></div>)}</div><div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">{t("configuredSteps", { configured: configuredNodeCount, total: form.nodes.length })}</div></section>
            <section className="mt-5 rounded-xl bg-foreground p-4 text-background"><p className="text-xs font-semibold">{t("autoGeneratedTitle")}</p><p className="mt-1 text-xs leading-5 text-background/70">{t("autoGeneratedHelp")}</p></section>
          </aside>
        </div>
      </div>
      {bindingDialog}
    </AdminPage>
  }

  return <AdminPage>
    <PageHeader title={t("title")} description={t("description")} icon={Workflow} actions={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />{t("newWorkflow")}</Button>} />
    <div className="grid gap-3 md:grid-cols-4">{(["draft", "reviewing", "approved", "released"] as const).map((status) => <Card key={status}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{t(`status.${status}`)}</p><p className="mt-1 text-2xl font-medium">{counts[status] || 0}</p></CardContent></Card>)}</div>
    {loading ? <PageSkeleton /> : <div className="grid gap-4 xl:grid-cols-2">{items.map((item) => <Card key={item.id}><CardHeader className="flex-row items-start justify-between space-y-0"><div><CardTitle>{item.name}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{item.key}:v{item.version} · rev {item.revision}</p></div><div className="flex gap-2"><Badge variant="secondary">{t(`status.${item.status}`)}</Badge>{item.releaseId && activeReleaseIds.has(item.releaseId) && <Badge>{t("active")}</Badge>}</div></CardHeader><CardContent><p className="min-h-10 text-sm text-muted-foreground">{item.description || t("noDescription")}</p><div className="mt-4 flex flex-wrap gap-2">{(item.status === "draft" || item.status === "rejected") && <Button size="sm" variant="outline" onClick={() => act(item, "submit")}><Send className="mr-1 h-3.5 w-3.5" />{t("submit")}</Button>}{(item.status === "draft" || item.status === "rejected") && <Button size="sm" variant="outline" onClick={() => openEdit(item)}><Pencil className="mr-1 h-3.5 w-3.5" />{t("edit")}</Button>}{item.status === "reviewing" && <><Button size="sm" variant="outline" onClick={() => act(item, "approve")}><Check className="mr-1 h-3.5 w-3.5" />{t("approve")}</Button><Button size="sm" variant="outline" onClick={() => act(item, "reject")}><X className="mr-1 h-3.5 w-3.5" />{t("reject")}</Button></>}{(item.status === "approved" || item.status === "released") && <Button size="sm" onClick={() => setBindingTarget(item)}>{item.status === "approved" ? <Rocket className="mr-1 h-3.5 w-3.5" /> : <Link className="mr-1 h-3.5 w-3.5" />}{t(item.status === "approved" ? "publishAndBind" : "bind")}</Button>}{item.status === "released" && <Button size="sm" variant="outline" disabled={saving} onClick={() => cloneNextVersion(item)}><CopyPlus className="mr-1 h-3.5 w-3.5" />{t("newVersion")}</Button>}</div></CardContent></Card>)}{items.length === 0 && <p className="text-sm text-muted-foreground">{t("empty")}</p>}</div>}
    {bindingDialog}
  </AdminPage>
}
