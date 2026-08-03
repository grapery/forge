"use client"

import { useCallback, useEffect, useMemo, useState, type DragEvent } from "react"
import { Workflow, Plus, Send, Check, X, Rocket, Pencil, Link, CopyPlus, GripVertical, Sparkles, ImageIcon, Save, ChevronRight, Trash2 } from "lucide-react"
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

const nodeTemplates: NodeTemplate[] = [
  { id: "generate_storyboard", activity: "storyboard.ensure_draft", type: "activity", titleKey: "nodePrepareTitle", descriptionKey: "nodePrepareDescription", required: true, icon: "sparkles" },
  { id: "generate_bible_plan", activity: "storyboard.generate_bible_plan", type: "activity", titleKey: "nodeBibleTitle", descriptionKey: "nodeBibleDescription", required: true, icon: "sparkles" },
  { id: "generate_scene_plan", activity: "storyboard.generate_scene_plan", type: "activity", titleKey: "nodeSceneTitle", descriptionKey: "nodeSceneDescription", required: true, icon: "sparkles" },
  { id: "persist_storyboard_content", activity: "storyboard.persist_content", type: "persist", titleKey: "nodePersistTitle", descriptionKey: "nodePersistDescription", required: true, icon: "save" },
  { id: "generate_storyboard_images", activity: "storyboard.ensure_images", type: "activity", titleKey: "nodeImagesTitle", descriptionKey: "nodeImagesDescription", icon: "image" },
]

const requiredActivities = nodeTemplates.filter((node) => node.required).map((node) => node.activity)
const defaultCanvas = (): CanvasNode[] => nodeTemplates.map((node) => ({ ...node, note: "" }))

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

export default function WorkflowsPage() {
  const t = useTranslations("workflows")
  const [items, setItems] = useState<WorkflowDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<WorkflowDraft | null>(null)
  const [bindingTarget, setBindingTarget] = useState<WorkflowDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ key: "", name: "", description: "", manifest: {} as Record<string, unknown>, nodes: defaultCanvas(), promptBundle: {} as Record<string, string> })
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
  const workflowReady = hasExecutableStoryboardPath(form.nodes)

  const openCreate = () => {
    setEditing(null)
    setForm({ key: "", name: "", description: "", manifest: {}, nodes: defaultCanvas(), promptBundle: {} })
    setSelectedNodeID("generate_storyboard")
    setOpen(true)
  }
  const openEdit = (item: WorkflowDraft) => {
    setEditing(item)
    const nodes = canvasFromDefinition(item.definition)
    setForm({ key: item.key, name: item.name, description: item.description || "", manifest: item.manifest || {}, nodes, promptBundle: item.promptBundle || {} })
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
  const onDrop = (event: DragEvent<HTMLDivElement>, targetID?: string) => {
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
        policies: editing?.policies || { maxDurationSeconds: 43200, maxParallelism: 4, maxAttempts: 3 },
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

  return <AdminPage>
    <PageHeader title={t("title")} description={t("description")} icon={Workflow} actions={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />{t("newWorkflow")}</Button>} />
    <div className="grid gap-3 md:grid-cols-4">{(["draft", "reviewing", "approved", "released"] as const).map((status) => <Card key={status}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{t(`status.${status}`)}</p><p className="mt-1 text-2xl font-medium">{counts[status] || 0}</p></CardContent></Card>)}</div>
    {loading ? <PageSkeleton /> : <div className="grid gap-4 xl:grid-cols-2">{items.map((item) => <Card key={item.id}><CardHeader className="flex-row items-start justify-between space-y-0"><div><CardTitle>{item.name}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{item.key}:v{item.version} · rev {item.revision}</p></div><div className="flex gap-2"><Badge variant="secondary">{t(`status.${item.status}`)}</Badge>{item.releaseId && activeReleaseIds.has(item.releaseId) && <Badge>{t("active")}</Badge>}</div></CardHeader><CardContent><p className="min-h-10 text-sm text-muted-foreground">{item.description || t("noDescription")}</p><div className="mt-4 flex flex-wrap gap-2">{(item.status === "draft" || item.status === "rejected") && <Button size="sm" variant="outline" onClick={() => act(item, "submit")}><Send className="mr-1 h-3.5 w-3.5" />{t("submit")}</Button>}{(item.status === "draft" || item.status === "rejected") && <Button size="sm" variant="outline" onClick={() => openEdit(item)}><Pencil className="mr-1 h-3.5 w-3.5" />{t("edit")}</Button>}{item.status === "reviewing" && <><Button size="sm" variant="outline" onClick={() => act(item, "approve")}><Check className="mr-1 h-3.5 w-3.5" />{t("approve")}</Button><Button size="sm" variant="outline" onClick={() => act(item, "reject")}><X className="mr-1 h-3.5 w-3.5" />{t("reject")}</Button></>}{(item.status === "approved" || item.status === "released") && <Button size="sm" onClick={() => setBindingTarget(item)}>{item.status === "approved" ? <Rocket className="mr-1 h-3.5 w-3.5" /> : <Link className="mr-1 h-3.5 w-3.5" />}{t(item.status === "approved" ? "publishAndBind" : "bind")}</Button>}{item.status === "released" && <Button size="sm" variant="outline" disabled={saving} onClick={() => cloneNextVersion(item)}><CopyPlus className="mr-1 h-3.5 w-3.5" />{t("newVersion")}</Button>}</div></CardContent></Card>)}{items.length === 0 && <p className="text-sm text-muted-foreground">{t("empty")}</p>}</div>}

    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto"><DialogHeader><DialogTitle>{t(editing ? "editTitle" : "createTitle")}</DialogTitle><DialogDescription>{t("canvasDescription")}</DialogDescription></DialogHeader><div className="grid gap-4"><div className="grid gap-3 md:grid-cols-2"><div><Label>{t("key")}</Label><Input disabled={!!editing} value={form.key} onChange={(event) => setForm({ ...form, key: event.target.value })} placeholder="storyboard_generation" /></div><div><Label>{t("name")}</Label><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={t("namePlaceholder")} /></div></div><div><Label>{t("workflowDescription")}</Label><Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder={t("descriptionPlaceholder")} /></div>
      <div className="rounded-xl border border-border bg-[#fbfbfa] p-3"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-semibold">{t("canvasTitle")}</p><p className="text-xs text-muted-foreground">{t("canvasHelp")}</p></div><Badge variant={workflowReady ? "secondary" : "outline"}>{workflowReady ? t("pathReady") : t("pathNeedsAttention")}</Badge></div><div className="grid gap-3 lg:grid-cols-[190px_minmax(0,1fr)_260px]"><aside className="rounded-lg border border-dashed border-border bg-background p-2"><p className="px-2 pb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{t("nodeLibrary")}</p><div className="space-y-1">{availableNodes.length === 0 ? <p className="px-2 py-3 text-xs text-muted-foreground">{t("allNodesAdded")}</p> : availableNodes.map((node) => { const Icon = nodeIcon(node.icon); return <button key={node.id} draggable onDragStart={(event) => { event.dataTransfer.setData("application/x-workflow-activity", node.activity); setDraggedNodeID(node.id) }} onClick={() => appendNode(node)} className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-xs transition-colors hover:bg-secondary"><Icon className="mt-0.5 h-3.5 w-3.5 text-primary" /><span><span className="block font-medium text-foreground">{t(node.titleKey)}</span><span className="block pt-0.5 leading-4 text-muted-foreground">{t(node.descriptionKey)}</span></span></button> })}</div></aside>
        <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event)} className="min-h-[420px] overflow-x-auto rounded-lg border border-border bg-background px-4 py-5"><div className="mx-auto flex min-w-max items-stretch gap-2">{form.nodes.map((node, index) => { const Icon = nodeIcon(node.icon); const isSelected = selectedNodeID === node.id; return <div key={node.id} className="flex items-center gap-2">{index > 0 && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}<div draggable onDragStart={(event) => { event.dataTransfer.setData("application/x-workflow-node", node.id); setDraggedNodeID(node.id) }} onDragEnd={() => setDraggedNodeID(null)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, node.id)} onClick={() => setSelectedNodeID(node.id)} className={`w-40 cursor-grab rounded-lg border p-3 transition-all active:cursor-grabbing ${isSelected ? "border-primary bg-blue-50 shadow-sm" : "border-border bg-card hover:border-primary/50"} ${draggedNodeID === node.id ? "opacity-45" : ""}`}><div className="flex items-center justify-between"><Icon className="h-4 w-4 text-primary" /><GripVertical className="h-3.5 w-3.5 text-muted-foreground" /></div><p className="mt-3 text-sm font-medium text-foreground">{t(node.titleKey)}</p><p className="mt-1 line-clamp-3 text-xs leading-4 text-muted-foreground">{node.note || t(node.descriptionKey)}</p>{node.required && <span className="mt-3 inline-block text-[10px] font-medium text-primary">{t("required")}</span>}</div></div> })}</div>{form.nodes.length === 0 && <div className="flex h-[360px] items-center justify-center text-center"><div><Workflow className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-3 text-sm font-medium">{t("dropNodeHere")}</p><p className="mt-1 text-xs text-muted-foreground">{t("dropNodeHereHelp")}</p></div></div>}</div>
        <aside className="rounded-lg border border-border bg-background p-3">{selectedNode ? <><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-semibold">{t(selectedNode.titleKey)}</p><p className="mt-1 text-xs text-muted-foreground">{t(selectedNode.descriptionKey)}</p></div>{!selectedNode.required && <Button size="icon" variant="ghost" aria-label={t("removeNode")} onClick={() => removeNode(selectedNode.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div><Label className="mt-5 block">{t("nodeNote")}</Label><Textarea className="mt-2 min-h-36 text-sm" value={selectedNode.note} onChange={(event) => updateNode(selectedNode.id, { note: event.target.value })} placeholder={t("nodeNotePlaceholder")} /><p className="mt-2 text-xs leading-4 text-muted-foreground">{t("nodeNoteHelp")}</p></> : <p className="text-sm text-muted-foreground">{t("selectNode")}</p>}</aside></div></div>
      {!workflowReady && <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{t("invalidStoryboardPath")}</p>}</div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button><Button disabled={saving || !form.key.trim() || !form.name.trim() || !workflowReady} onClick={save}>{saving ? t("saving") : t(editing ? "saveChanges" : "create")}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={!!bindingTarget} onOpenChange={(value) => { if (!value) setBindingTarget(null) }}><DialogContent><DialogHeader><DialogTitle>{t("bindingTitle")}</DialogTitle><DialogDescription>{t("bindingDescription")}</DialogDescription></DialogHeader><div className="grid gap-4"><div><Label>{t("surface")}</Label><Input value={binding.surface} onChange={(event) => setBinding({ ...binding, surface: event.target.value })} /></div><div><Label>{t("action")}</Label><Input value={binding.action} onChange={(event) => setBinding({ ...binding, action: event.target.value })} /></div><div className="grid grid-cols-2 gap-3"><div><Label>{t("tenantId")}</Label><Input value={binding.tenantId} onChange={(event) => setBinding({ ...binding, tenantId: event.target.value })} placeholder={t("globalBinding")} /></div><div><Label>{t("priority")}</Label><Input type="number" value={binding.priority} onChange={(event) => setBinding({ ...binding, priority: event.target.value })} /></div></div></div><DialogFooter><Button variant="outline" onClick={() => setBindingTarget(null)}>{t("cancel")}</Button><Button disabled={saving || !binding.surface.trim() || !binding.action.trim()} onClick={publishAndBind}>{saving ? t("saving") : t("confirmBinding")}</Button></DialogFooter></DialogContent></Dialog>
  </AdminPage>
}
