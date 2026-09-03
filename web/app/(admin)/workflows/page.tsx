"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react"
import { Workflow, Plus, Send, Check, X, Rocket, Pencil, Link, CopyPlus, GripVertical, Sparkles, ImageIcon, Save, Trash2, ArrowLeft, ArrowDown, ArrowUp, ArrowUpRight, CircleCheck, CircleDashed, Clock3, Layers3, Settings2, PauseCircle, RotateCcw, Eye, FileText, Play } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

import { contentApi, promptTemplateApi, workflowApi } from "@/lib/api/admin"
import type { CreateWorkflowDraftRequest, PromptTemplateDraft, WorkflowCatalogEntry, WorkflowDraft, WorkflowNode, WorkflowReleaseStats } from "@/lib/types"
import { AdminPage } from "@/components/layout/admin-page"
import { PageHeader } from "@/components/shared/page-header"
import { PageSkeleton } from "@/components/shared/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type NodeFieldType = "text" | "number" | "boolean" | "select"

type NodeField = {
  key: string
  labelKey: string
  type: NodeFieldType
  options?: string[]
}

type NodeTemplate = {
  id: string
  activity: string
  type: "activity" | "persist"
  titleKey: string
  descriptionKey: string
  required?: boolean
  icon: "sparkles" | "save" | "image" | "clock" | "layers"
  /** Marketplace-style gradient used on icon tiles. */
  tone: "amber" | "sky" | "emerald" | "violet"
  /** inputDefaults surfaced as structured form controls. */
  fields?: NodeField[]
  /** Grapery prompt slots consumable under this node (bundle key `<id>:<slot>`). */
  promptSlots?: string[]
}

type CanvasNode = NodeTemplate & { configText: string }

type WorkflowBindingForm = {
  id?: string
  surface: string
  action: string
  tenantId: string
  priority: string
  conditionsText: string
}

type WorkflowSettings = {
  maxDurationHours: string
  maxParallelism: string
  maxAttempts: string
}

type WorkflowKind = "storyboard" | "fragment" | "storyboardBranch"

// Grapery resolves storyboard prompt slots under the fixed conceptual node ids
// below, so these template ids double as prompt-bundle keys and must not drift.
const storyboardCatalog: NodeTemplate[] = [
	{ id: "plan_generation", activity: "ai.runtime.plan", type: "activity", titleKey: "nodePlannerTitle", descriptionKey: "nodePlannerDescription", required: true, icon: "sparkles", tone: "violet" },
  { id: "generate_storyboard", activity: "storyboard.ensure_draft", type: "activity", titleKey: "nodePrepareTitle", descriptionKey: "nodePrepareDescription", required: true, icon: "sparkles", tone: "amber",
    fields: [
      { key: "sceneCount", labelKey: "fieldSceneCount", type: "number" },
      { key: "comicStyle", labelKey: "fieldComicStyle", type: "text" },
      { key: "language", labelKey: "fieldLanguage", type: "select", options: ["zh-Hans", "en"] },
      { key: "regenerateStructure", labelKey: "fieldRegenerateStructure", type: "boolean" },
    ],
    promptSlots: ["bible_plan", "scene_plan", "json_repair"] },
  { id: "generate_bible_plan", activity: "storyboard.generate_bible_plan", type: "activity", titleKey: "nodeBibleTitle", descriptionKey: "nodeBibleDescription", required: true, icon: "sparkles", tone: "amber",
    fields: [
      { key: "sceneCount", labelKey: "fieldSceneCount", type: "number" },
      { key: "comicStyle", labelKey: "fieldComicStyle", type: "text" },
    ] },
  { id: "generate_scene_plan", activity: "storyboard.generate_scene_plan", type: "activity", titleKey: "nodeSceneTitle", descriptionKey: "nodeSceneDescription", required: true, icon: "sparkles", tone: "amber",
    fields: [
      { key: "sceneCount", labelKey: "fieldSceneCount", type: "number" },
      { key: "comicStyle", labelKey: "fieldComicStyle", type: "text" },
    ] },
  { id: "review_storyboard_content", activity: "storyboard.review_content", type: "activity", titleKey: "nodeReviewTitle", descriptionKey: "nodeReviewDescription", required: true, icon: "sparkles", tone: "violet" },
  { id: "persist_storyboard_content", activity: "storyboard.persist_content", type: "persist", titleKey: "nodePersistTitle", descriptionKey: "nodePersistDescription", required: true, icon: "save", tone: "amber" },
  { id: "await_storyboard_content", activity: "storyboard.await_content", type: "activity", titleKey: "nodeAwaitTitle", descriptionKey: "nodeAwaitDescription", icon: "clock", tone: "amber",
    fields: [{ key: "pollTimeoutSec", labelKey: "fieldPollTimeout", type: "number" }] },
  { id: "generate_storyboard_images", activity: "storyboard.ensure_images", type: "activity", titleKey: "nodeImagesTitle", descriptionKey: "nodeImagesDescription", icon: "image", tone: "amber" },
  { id: "legacy_storyboard_generate", activity: "legacy.storyboard.generate", type: "activity", titleKey: "nodeLegacyStoryboardTitle", descriptionKey: "nodeLegacyStoryboardDescription", icon: "layers", tone: "violet",
    fields: [
      { key: "sceneCount", labelKey: "fieldSceneCount", type: "number" },
      { key: "comicStyle", labelKey: "fieldComicStyle", type: "text" },
      { key: "language", labelKey: "fieldLanguage", type: "select", options: ["zh-Hans", "en"] },
      { key: "aspectRatio", labelKey: "fieldAspectRatio", type: "text" },
      { key: "useComicPagePipeline", labelKey: "fieldComicPagePipeline", type: "boolean" },
      { key: "generateImages", labelKey: "fieldGenerateImages", type: "boolean" },
      { key: "regenerateStructure", labelKey: "fieldRegenerateStructure", type: "boolean" },
    ] },
]

const plannerInputPatchAllowlist = ["sceneCount", "generateImages", "continuityLevel", "visualBibleStrategy", "characterStrategy", "acceptanceChecks"] as const

const fragmentCatalog: NodeTemplate[] = [
  { id: "generate_fragment", activity: "legacy.fragment.generate", type: "activity", titleKey: "nodeFragmentTitle", descriptionKey: "nodeFragmentDescription", required: true, icon: "image", tone: "sky",
    fields: [
      { key: "style", labelKey: "fieldStyle", type: "text" },
      { key: "mood", labelKey: "fieldMood", type: "text" },
      { key: "length", labelKey: "fieldLength", type: "select", options: ["short", "medium", "long"] },
      { key: "language", labelKey: "fieldLanguage", type: "select", options: ["zh-Hans", "en"] },
      { key: "imageCount", labelKey: "fieldImageCount", type: "number" },
      { key: "aspectRatio", labelKey: "fieldAspectRatio", type: "text" },
      { key: "visibility", labelKey: "fieldVisibility", type: "select", options: ["private", "public"] },
      { key: "consistencyLevel", labelKey: "fieldConsistency", type: "select", options: ["low", "medium", "high"] },
      { key: "enableReferenceAssets", labelKey: "fieldEnableRefAssets", type: "boolean" },
    ] },
]

const storyboardBranchCatalog: NodeTemplate[] = [
  { id: "generate_storyboard_branch", activity: "legacy.storyboard.branch", type: "activity", titleKey: "nodeBranchTitle", descriptionKey: "nodeBranchDescription", required: true, icon: "sparkles", tone: "emerald",
    fields: [
      { key: "sceneCount", labelKey: "fieldSceneCount", type: "number" },
      { key: "branchCount", labelKey: "fieldBranchCount", type: "number" },
      { key: "comicStyle", labelKey: "fieldComicStyle", type: "text" },
    ],
    promptSlots: ["content", "scene_plan"] },
]

const catalogForKind = (kind: WorkflowKind) => kind === "fragment" ? fragmentCatalog : kind === "storyboardBranch" ? storyboardBranchCatalog : storyboardCatalog
const templatesForKind = catalogForKind
const defaultCanvas = (kind: WorkflowKind): CanvasNode[] => catalogForKind(kind).filter((node) => node.required).map((node) => ({ ...node, configText: "" }))
const defaultSettings = (): WorkflowSettings => ({ maxDurationHours: "12", maxParallelism: "4", maxAttempts: "3" })

const toneGradient: Record<NodeTemplate["tone"], string> = {
  amber: "from-amber-100 to-rose-100",
  sky: "from-sky-100 to-indigo-100",
  emerald: "from-emerald-100 to-teal-100",
  violet: "from-violet-100 to-fuchsia-100",
}

function nodeIcon(icon: NodeTemplate["icon"]) {
  if (icon === "save") return Save
  if (icon === "image") return ImageIcon
  if (icon === "clock") return Clock3
  if (icon === "layers") return Layers3
  return Sparkles
}

function canvasFromDefinition(definition: WorkflowDraft["definition"], kind: WorkflowKind): CanvasNode[] {
  return definition.nodes.flatMap((node) => {
    const template = templatesForKind(kind).find((item) => item.activity === node.activity)
    if (!template) return []
    return [{ ...template, id: node.id, configText: node.config && Object.keys(node.config).length > 0 ? JSON.stringify(node.config, null, 2) : "" }]
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
			config: node.activity === "ai.runtime.plan"
				? { ...(node.configText.trim() ? JSON.parse(node.configText) as Record<string, unknown> : {}), inputPatchAllowlist: [...plannerInputPatchAllowlist] }
				: node.configText.trim() ? JSON.parse(node.configText) as Record<string, unknown> : undefined,
    })),
  }
}

function hasValidNodeConfig(node: CanvasNode) {
  if (!node.configText.trim()) return true
  try {
    const parsed = JSON.parse(node.configText) as Record<string, unknown>
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false
		if (Object.keys(parsed).some((key) => key !== "inputDefaults" && key !== "inputPatchAllowlist" && key !== "operatorNote")) return false
		const defaults = parsed.inputDefaults
		const allowlist = parsed.inputPatchAllowlist
		const validPatchKeys = new Set<string>(plannerInputPatchAllowlist)
		return (defaults === undefined || Boolean(defaults) && typeof defaults === "object" && !Array.isArray(defaults)) &&
			(allowlist === undefined || Array.isArray(allowlist) && allowlist.every((value) => typeof value === "string" && validPatchKeys.has(value)))
  } catch {
    return false
  }
}

function parsePromptBundle(text: string): Record<string, string> {
  if (!text.trim()) return {}
  const parsed = JSON.parse(text)
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || Object.values(parsed).some((value) => typeof value !== "string" || !value.trim())) {
    throw new Error("invalid prompt bundle")
  }
  return parsed as Record<string, string>
}

function hasValidPromptBundle(text: string) {
  try { parsePromptBundle(text); return true } catch { return false }
}

function workflowManifest(source: Record<string, unknown> | undefined, name: string, description: string, kind: WorkflowKind) {
  const existing = source || {}
  const catalog = typeof existing.catalog === "object" && existing.catalog !== null && !Array.isArray(existing.catalog)
    ? existing.catalog as Record<string, unknown>
    : {}
  return {
    ...existing,
    catalog: { ...catalog, title: name, summary: description, category: catalog.category || "creation", artifact: kind },
    supportedClients: Array.isArray(existing.supportedClients) && existing.supportedClients.length > 0 ? existing.supportedClients : ["voyager"],
  }
}

function hasExecutablePath(nodes: CanvasNode[], kind: WorkflowKind) {
  const requiredActivities = templatesForKind(kind).filter((node) => node.required).map((node) => node.activity)
  return requiredActivities.every((activity, index) => nodes[index]?.activity === activity)
}

function workflowKindFromDraft(item: WorkflowDraft): WorkflowKind {
  if (item.definition.nodes.some((node) => node.activity === "legacy.fragment.generate")) return "fragment"
	if (item.definition.nodes.some((node) => node.activity === "legacy.storyboard.branch")) return "storyboardBranch"
  const catalog = item.manifest?.catalog
  if (catalog && typeof catalog === "object" && !Array.isArray(catalog) && (catalog as Record<string, unknown>).artifact === "fragment") return "fragment"
  return "storyboard"
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
  return Number.isFinite(durationHours) && durationHours >= 5 / 60 && durationHours <= 12
    && Number.isInteger(maxParallelism) && maxParallelism >= 1 && maxParallelism <= 32
    && Number.isInteger(maxAttempts) && maxAttempts >= 1 && maxAttempts <= 10
}

export default function WorkflowsPage() {
  const t = useTranslations("workflows")
  const [items, setItems] = useState<WorkflowDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<WorkflowDraft | null>(null)
  const [viewing, setViewing] = useState(false)
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "reviewing" | "approved" | "rejected" | "released">("all")
  const [testRunTarget, setTestRunTarget] = useState<WorkflowDraft | null>(null)
  const [testRunForm, setTestRunForm] = useState({ surface: "", action: "", inputText: "" })
  const [testRun, setTestRun] = useState<{ runId: string; status: string; error?: string; output?: unknown; tokensUsed?: number } | null>(null)
  const [testRunHistory, setTestRunHistory] = useState<Array<Record<string, unknown>>>([])
  const [testRunRef, setTestRunRef] = useState<{ kind: "story" | "storyboard" | null; options: Array<{ id: string; title: string }> }>({ kind: null, options: [] })
  const [testRunResult, setTestRunResult] = useState<Record<string, unknown> | null>(null)
  const testRunPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [bindingTarget, setBindingTarget] = useState<WorkflowDraft | null>(null)
  const [saving, setSaving] = useState(false)
	const [aiOpen, setAiOpen] = useState(false)
	const [aiPrompt, setAiPrompt] = useState("")
	const [aiGenerating, setAiGenerating] = useState(false)
  const [form, setForm] = useState({ kind: "storyboard" as WorkflowKind, key: "", name: "", description: "", manifest: {} as Record<string, unknown>, nodes: defaultCanvas("storyboard"), promptBundle: {} as Record<string, string>, settings: defaultSettings() })
  const [promptBundleText, setPromptBundleText] = useState("")
  const [binding, setBinding] = useState<WorkflowBindingForm>({ surface: "voyager.storyboard", action: "generate", tenantId: "", priority: "100", conditionsText: "" })
  const [draggedNodeID, setDraggedNodeID] = useState<string | null>(null)
  const [selectedNodeID, setSelectedNodeID] = useState<string | null>(null)
  const [releasedPrompts, setReleasedPrompts] = useState<PromptTemplateDraft[]>([])
  const [activeReleaseIds, setActiveReleaseIds] = useState<Set<string>>(new Set())
  const [activeBindings, setActiveBindings] = useState<WorkflowCatalogEntry[]>([])
  const [releaseStats, setReleaseStats] = useState<Record<string, WorkflowReleaseStats>>({})

  const load = useCallback(() => {
    workflowApi.list({ page: 1, pageSize: 100 })
      .then((data) => setItems(data.items || []))
      .catch((error) => toast.error(error?.message || t("loadFailed")))
      .finally(() => setLoading(false))
  }, [t])
  const loadBindings = useCallback(() => {
    Promise.all([
      workflowApi.listBindings({ surface: "voyager.storyboard", action: "generate" }),
      workflowApi.listBindings({ surface: "voyager.fragment", action: "generate" }),
			workflowApi.listBindings({ surface: "voyager.storyboard", action: "branch" }),
    ])
      .then((pages) => {
        const entries = pages.flatMap((data) => data.items || [])
        setActiveBindings(entries)
        setActiveReleaseIds(new Set(entries.map((entry) => entry.release.id)))
      })
      .catch(() => { setActiveBindings([]); setActiveReleaseIds(new Set()) })
  }, [])
  const loadStats = useCallback(() => {
    workflowApi.stats(30)
      .then((data) => setReleaseStats(Object.fromEntries((data.items || []).map((item) => [item.workflowReleaseId, item]))))
      .catch(() => setReleaseStats({}))
  }, [])

  useEffect(() => {
    if (!testRun?.runId || ["succeeded", "failed", "cancelled"].includes(testRun.status)) return
    if (testRunPollRef.current) clearInterval(testRunPollRef.current)
    testRunPollRef.current = setInterval(async () => {
      try {
        const run = await workflowApi.getTestRun(testRun.runId)
        setTestRun((current) => current && run ? {
          runId: String(run.runId ?? current.runId),
          status: String(run.status ?? current.status),
          output: parseRunOutput(run.output ?? current.output),
          error: run.error ? String(run.error) : current.error,
          tokensUsed: Number(run.tokensUsed ?? current.tokensUsed ?? 0),
        } : current)
        if (["succeeded", "failed", "cancelled"].includes(String(run.status))) loadTestRunResult(String(run.runId))
      } catch { /* transient relay errors are tolerated while polling */ }
    }, 3000)
    return () => { if (testRunPollRef.current) clearInterval(testRunPollRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testRun?.runId, testRun?.status])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadBindings() }, [loadBindings])
  useEffect(() => { loadStats() }, [loadStats])
  useEffect(() => {
    if (!open) return
    promptTemplateApi.list({ page: 1, pageSize: 100, status: "released" })
      .then((data) => setReleasedPrompts(data.items || []))
      .catch(() => setReleasedPrompts([]))
  }, [open])

  const counts = useMemo(() => items.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1
    return acc
  }, {}), [items])
  const selectedNode = form.nodes.find((node) => node.id === selectedNodeID) || null
  const selectedTemplate = selectedNode ? catalogForKind(form.kind).find((item) => item.activity === selectedNode.activity) || null : null
  const availableNodes = templatesForKind(form.kind).filter((template) => !form.nodes.some((node) => node.activity === template.activity))
  const workflowReady = hasExecutablePath(form.nodes, form.kind) && hasValidSettings(form.settings) && form.nodes.every(hasValidNodeConfig) && hasValidPromptBundle(promptBundleText)
  const detailsReady = Boolean(form.key.trim() && form.name.trim())
  const builderReady = detailsReady && workflowReady
  const configuredNodeCount = form.nodes.filter((node) => node.configText.trim()).length
  const promptBundle = useMemo(() => {
    if (!promptBundleText.trim()) return {} as Record<string, string>
    try {
      const parsed = JSON.parse(promptBundleText) as unknown
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, string>
    } catch { /* invalid JSON is surfaced by hasValidPromptBundle */ }
    return {} as Record<string, string>
  }, [promptBundleText])
  const releasedPromptOptions = releasedPrompts
    .filter((draft) => draft.status === "released" && (draft.releaseId || draft.id))
    .map((draft) => ({ value: draft.releaseId || `ptv_${draft.id.replace(/^pfd_/, "")}`, label: `${draft.key} · v${draft.version}` }))

  const setNodeInputDefault = (nodeID: string, key: string, value: unknown) => {
    setForm((current) => {
      const node = current.nodes.find((entry) => entry.id === nodeID)
      if (!node) return current
      let defaults: Record<string, unknown> = {}
      if (node.configText.trim()) {
        try {
          const parsed = JSON.parse(node.configText) as Record<string, unknown>
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && parsed.inputDefaults && typeof parsed.inputDefaults === "object") {
            defaults = { ...(parsed.inputDefaults as Record<string, unknown>) }
          }
        } catch { return current }
      }
      if (value === "" || value === undefined || value === null) delete defaults[key]
      else defaults[key] = value
      const configText = Object.keys(defaults).length > 0 ? JSON.stringify({ inputDefaults: defaults }, null, 2) : ""
      return { ...current, nodes: current.nodes.map((entry) => entry.id === nodeID ? { ...entry, configText } : entry) }
    })
  }

  const nodeInputDefaults = (node: CanvasNode): Record<string, unknown> => {
    if (!node.configText.trim()) return {}
    try {
      const parsed = JSON.parse(node.configText) as Record<string, unknown>
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && parsed.inputDefaults && typeof parsed.inputDefaults === "object") {
        return parsed.inputDefaults as Record<string, unknown>
      }
    } catch { /* surfaced by hasValidNodeConfig */ }
    return {}
  }

  const setPromptBinding = (nodeID: string, slot: string, value: string) => {
    const key = slot ? `${nodeID}:${slot}` : nodeID
    const next = { ...promptBundle }
    if (value) next[key] = value
    else delete next[key]
    setPromptBundleText(Object.keys(next).length > 0 ? JSON.stringify(next, null, 2) : "")
  }

  const testRunInputTemplate = (kind: WorkflowKind) => kind === "fragment"
    ? { userInput: "试运行输入", imageCount: 1 }
    : kind === "storyboardBranch"
      ? { parentStoryboardId: "替换为父故事板ID", seedPrompt: "试运行种子提示", sceneCount: 3 }
      : { storyId: "替换为故事ID", rawInput: "试运行输入", sceneCount: 3 }

  const parseRunOutput = (raw: unknown): unknown => {
    if (typeof raw !== "string") return raw
    try { return JSON.parse(raw) } catch { return raw }
  }

  const loadTestRunHistory = (releaseId: string) => {
    workflowApi.listTestRuns(releaseId)
      .then((data) => setTestRunHistory(data.items || []))
      .catch(() => setTestRunHistory([]))
  }

  const loadTestRunResult = (runId: string) => {
    setTestRunResult(null)
    workflowApi.getTestRunResult(runId)
      .then((data) => setTestRunResult(data))
      .catch(() => setTestRunResult(null))
  }

  const openTestRun = (item: WorkflowDraft) => {
    const kind = workflowKindFromDraft(item)
    setTestRunTarget(item)
    setTestRunForm({
      surface: kind === "storyboardBranch" ? "voyager.storyboard" : `voyager.${kind}`,
      action: kind === "storyboardBranch" ? "branch" : "generate",
      inputText: JSON.stringify(testRunInputTemplate(kind), null, 2),
    })
    setTestRun(null)
    setTestRunHistory([])
    if (item.releaseId) loadTestRunHistory(item.releaseId)
    if (kind === "fragment") {
      setTestRunRef({ kind: null, options: [] })
      return
    }
    const refKind = kind === "storyboardBranch" ? "storyboard" : "story"
    contentApi.list({ page: 1, pageSize: 50, contentType: refKind })
      .then((data) => setTestRunRef({ kind: refKind, options: (data.items || []).map((entry) => ({ id: entry.id, title: entry.title || entry.id })) }))
      .catch(() => setTestRunRef({ kind: refKind, options: [] }))
  }

  const setTestRunInputField = (key: string, value: unknown) => {
    let current: Record<string, unknown> = {}
    try {
      const parsed = JSON.parse(testRunForm.inputText) as unknown
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) current = parsed as Record<string, unknown>
    } catch { /* replaced below on invalid JSON */ }
    if (value === "" || value === undefined || value === null) delete current[key]
    else current[key] = value
    setTestRunForm((form) => ({ ...form, inputText: JSON.stringify(current, null, 2) }))
  }

  const testRunInputRefValue = (key: string) => {
    try {
      const parsed = JSON.parse(testRunForm.inputText) as unknown
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const value = (parsed as Record<string, unknown>)[key]
        return typeof value === "string" ? value : ""
      }
    } catch { /* invalid JSON surfaced by validation */ }
    return ""
  }

  const closeTestRun = () => {
    setTestRunTarget(null)
    setTestRun(null)
    setTestRunResult(null)
  }

  const startTestRun = async () => {
    if (!testRunTarget?.releaseId) return
    let input: Record<string, unknown>
    try {
      const parsed = JSON.parse(testRunForm.inputText) as unknown
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid")
      input = parsed as Record<string, unknown>
    } catch {
      toast.error(t("testRunInvalidInput"))
      return
    }
    try {
      setSaving(true)
      const run = await workflowApi.startTestRun(testRunTarget.id, { surface: testRunForm.surface.trim(), action: testRunForm.action.trim(), input, testRun: true })
      setTestRun({ runId: String(run?.runId ?? run?.id ?? ""), status: String(run?.status ?? "pending"), output: parseRunOutput(run?.output), error: run?.error ? String(run.error) : undefined, tokensUsed: Number(run?.tokensUsed ?? 0) })
      loadTestRunHistory(testRunTarget.releaseId)
      toast.success(t("testRunStarted"))
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("actionFailed"))
    } finally {
      setSaving(false)
    }
  }

  const openCreate = () => {
    setEditing(null)
    setViewing(false)
    setForm({ kind: "storyboard", key: "", name: "", description: "", manifest: {}, nodes: defaultCanvas("storyboard"), promptBundle: {}, settings: defaultSettings() })
    setPromptBundleText("")
		setSelectedNodeID("plan_generation")
    setOpen(true)
  }
  const openEdit = (item: WorkflowDraft) => {
    setEditing(item)
    setViewing(false)
    const kind = workflowKindFromDraft(item)
    const nodes = canvasFromDefinition(item.definition, kind)
    setForm({ kind, key: item.key, name: item.name, description: item.description || "", manifest: item.manifest || {}, nodes, promptBundle: item.promptBundle || {}, settings: settingsFromPolicies(item.policies) })
    setPromptBundleText(item.promptBundle && Object.keys(item.promptBundle).length > 0 ? JSON.stringify(item.promptBundle, null, 2) : "")
    setSelectedNodeID(nodes[0]?.id || null)
    setOpen(true)
  }
  // Released versions have no editable draft: open the studio read-only so
  // operators can inspect the exact published definition without cloning.
  const openView = (item: WorkflowDraft) => {
    openEdit(item)
    setViewing(true)
  }
  const selectKind = (kind: WorkflowKind) => {
    if (editing || kind === form.kind) return
    const nodes = defaultCanvas(kind)
    setForm((current) => ({ ...current, kind, nodes, promptBundle: {} }))
    setPromptBundleText("")
    setSelectedNodeID(nodes[0]?.id || null)
  }
  const openBinding = (item: WorkflowDraft) => {
    const kind = workflowKindFromDraft(item)
    const isBranch = kind === "storyboardBranch"
    const surface = isBranch ? "voyager.storyboard" : `voyager.${kind}`
    const action = isBranch ? "branch" : "generate"
    const existing = activeBindings.find((entry) => entry.binding.surface === surface && entry.binding.action === action && entry.binding.workflowKey === item.key)
    setBinding({
      id: existing?.binding.id,
      surface,
      action,
      tenantId: existing?.binding.tenantId || "",
      priority: String(existing?.binding.priority ?? 100),
      conditionsText: existing?.binding.conditions ? JSON.stringify(existing.binding.conditions, null, 2) : "",
    })
    setBindingTarget(item)
  }

  const updateNode = (nodeID: string, updates: Partial<CanvasNode>) => {
    setForm((current) => ({ ...current, nodes: current.nodes.map((node) => node.id === nodeID ? { ...node, ...updates } : node) }))
  }
  const appendNode = (template: NodeTemplate) => {
    setForm((current) => ({ ...current, nodes: [...current.nodes, { ...template, configText: "" }] }))
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
      const template = templatesForKind(form.kind).find((node) => node.activity === activity)
      if (template && !form.nodes.some((node) => node.activity === activity)) appendNode(template)
    } else if (sourceID && targetID) {
      moveNode(sourceID, targetID)
    }
    setDraggedNodeID(null)
  }

  const save = async () => {
    if (!workflowReady) {
      toast.error(t("invalidWorkflowPath"))
      return
    }
    try {
      setSaving(true)
      const payload: CreateWorkflowDraftRequest = {
        key: form.key.trim(), name: form.name.trim(), description: form.description.trim(),
        manifest: workflowManifest(form.manifest, form.name.trim(), form.description.trim(), form.kind),
        definition: definitionFromCanvas(form.nodes),
        policies: policiesFromSettings(form.settings),
        promptBundle: parsePromptBundle(promptBundleText),
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
	const generateWithAI = async () => {
		if (!aiPrompt.trim()) return
		try {
			setAiGenerating(true)
			const generated = await workflowApi.generate(aiPrompt.trim())
				const kind: WorkflowKind = generated.definition.nodes.some((node) => node.activity === "legacy.fragment.generate") ? "fragment" : generated.definition.nodes.some((node) => node.activity === "legacy.storyboard.branch") ? "storyboardBranch" : "storyboard"
				const nodes = canvasFromDefinition(generated.definition, kind)
				setForm((current) => ({
					kind,
				key: editing ? current.key : generated.key,
				name: generated.name,
				description: generated.description || "",
				manifest: generated.manifest || {},
				nodes,
				promptBundle: generated.promptBundle || {},
				settings: settingsFromPolicies(generated.policies),
			}))
			setSelectedNodeID(nodes[0]?.id || null)
			setPromptBundleText(generated.promptBundle && Object.keys(generated.promptBundle).length > 0 ? JSON.stringify(generated.promptBundle, null, 2) : "")
			setAiOpen(false)
			toast.success(t("aiApplied"))
		} catch (error: unknown) {
			toast.error(error instanceof Error ? error.message : t("aiGenerateFailed"))
		} finally {
			setAiGenerating(false)
		}
	}
  const publishAndBind = async () => {
    if (!bindingTarget) return
    try {
      setSaving(true)
      const releaseId = bindingTarget.releaseId || (await workflowApi.publish(bindingTarget.id)).id
      let conditions: Record<string, unknown> | undefined
      if (binding.conditionsText.trim()) {
        const parsed = JSON.parse(binding.conditionsText)
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(t("invalidConditions"))
        conditions = parsed as Record<string, unknown>
      }
	      const existingRoutes = activeBindings.filter((entry) => entry.binding.surface === binding.surface.trim() && entry.binding.action === binding.action.trim() && entry.binding.workflowKey === bindingTarget.key && entry.release.id !== releaseId)
	      if (bindingTarget.status === "released" && existingRoutes.length > 0) {
	        await workflowApi.rebindRelease(releaseId, { surface: binding.surface.trim(), action: binding.action.trim(), workflowKey: bindingTarget.key })
	      } else {
	        await workflowApi.bind({ id: binding.id, surface: binding.surface.trim(), action: binding.action.trim(), tenantId: binding.tenantId.trim() || undefined, workflowKey: bindingTarget.key, releaseId, priority: Number(binding.priority) || 0, enabled: true, conditions })
	      }
      toast.success(t("publishedAndBound"))
      setBindingTarget(null)
      load()
      loadBindings()
      loadStats()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("actionFailed"))
    } finally {
      setSaving(false)
    }
  }
  const pauseRelease = async (item: WorkflowDraft) => {
    if (!item.releaseId) return
    const matches = activeBindings.filter((entry) => entry.release.id === item.releaseId)
		if (matches.length === 0) return
    try {
      setSaving(true)
			await workflowApi.pauseReleaseBindings(item.releaseId)
      toast.success(t("paused"))
      loadBindings()
    } catch (error: unknown) { toast.error(error instanceof Error ? error.message : t("actionFailed")) }
    finally { setSaving(false) }
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

  const bindingDialog = <Dialog open={!!bindingTarget} onOpenChange={(value) => { if (!value) setBindingTarget(null) }}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>{t("bindingTitle")}</DialogTitle><DialogDescription>{t("bindingDescription")}</DialogDescription></DialogHeader><div className="grid gap-4"><div><Label>{t("surface")}</Label><Input value={binding.surface} onChange={(event) => setBinding({ ...binding, surface: event.target.value })} /></div><div><Label>{t("action")}</Label><Input value={binding.action} onChange={(event) => setBinding({ ...binding, action: event.target.value })} /></div><div className="grid grid-cols-2 gap-3"><div><Label>{t("tenantId")}</Label><Input value={binding.tenantId} onChange={(event) => setBinding({ ...binding, tenantId: event.target.value })} placeholder={t("globalBinding")} /></div><div><Label>{t("priority")}</Label><Input type="number" value={binding.priority} onChange={(event) => setBinding({ ...binding, priority: event.target.value })} /></div></div><div><Label htmlFor="workflow-routing-conditions">{t("routingConditions")}</Label><Textarea id="workflow-routing-conditions" className="mt-1.5 min-h-36 font-mono text-xs" value={binding.conditionsText} onChange={(event) => setBinding({ ...binding, conditionsText: event.target.value })} placeholder={'{"all":[{"field":"narrativeMode","op":"eq","value":"action"}]}'}/><p className="mt-1 text-xs text-muted-foreground">{t("routingConditionsHelp")}</p></div></div><DialogFooter><Button variant="outline" onClick={() => setBindingTarget(null)}>{t("cancel")}</Button><Button disabled={saving || !binding.surface.trim() || !binding.action.trim()} onClick={publishAndBind}>{saving ? t("saving") : t("confirmBinding")}</Button></DialogFooter></DialogContent></Dialog>
	const aiDialog = <Dialog open={aiOpen} onOpenChange={setAiOpen}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />{t("aiGenerateTitle")}</DialogTitle><DialogDescription>{t("aiGenerateDescription")}</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor="workflow-ai-prompt">{t("aiRequirements")}</Label><Textarea id="workflow-ai-prompt" className="min-h-48 resize-y" value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} placeholder={t("aiPromptPlaceholder")} /><p className="text-xs leading-5 text-muted-foreground">{t("aiGenerateHelp")}</p></div><DialogFooter><Button variant="outline" onClick={() => setAiOpen(false)}>{t("cancel")}</Button><Button disabled={aiGenerating || !aiPrompt.trim()} onClick={generateWithAI}><Sparkles className="mr-2 h-4 w-4" />{aiGenerating ? t("aiGenerating") : t("aiGenerateAndApply")}</Button></DialogFooter></DialogContent></Dialog>

  if (open) {
    return <AdminPage className="-mx-2 -mt-2 space-y-0">
      <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
        <header className="flex flex-col gap-4 border-b border-border bg-background/95 px-5 py-4 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Button size="icon" variant="ghost" aria-label={t("backToWorkflows")} onClick={() => { setOpen(false); setViewing(false) }}><ArrowLeft className="h-4 w-4" /></Button>
            <div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t("builderEyebrow")}</p><h1 className="truncate text-xl font-semibold tracking-tight">{viewing ? t("viewTitle") : editing ? t("editTitle") : t("createTitle")}</h1></div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pl-12 md:pl-0">{viewing ? <><div className="flex items-center gap-2 rounded-full border border-border bg-muted/55 px-3 py-1.5 text-xs font-medium text-muted-foreground"><Eye className="h-3.5 w-3.5" />{t("viewOnly")}</div><Button variant="outline" onClick={() => { setOpen(false); setViewing(false) }}>{t("backToWorkflows")}</Button></> : <><div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${builderReady ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>{builderReady ? <CircleCheck className="h-3.5 w-3.5" /> : <CircleDashed className="h-3.5 w-3.5" />}{builderReady ? t("readyToSave") : t("incompleteSetup")}</div><Button variant="outline" onClick={() => setAiOpen(true)}><Sparkles className="mr-2 h-4 w-4" />{t("aiGenerate")}</Button><Button variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button><Button disabled={saving || !builderReady} onClick={save}><Save className="mr-2 h-4 w-4" />{saving ? t("saving") : t(editing ? "saveChanges" : "create")}</Button></>}</div>
        </header>

        <fieldset disabled={viewing} className="min-w-0 border-0 p-0 m-0">
        <section className="border-b border-border bg-[#fbfbfa] px-5 py-4">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">
              <div className="flex items-start gap-2"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-background text-[11px] font-semibold">3</span><div><Label htmlFor="workflow-prompt-bundle">{t("promptBindingsTitle")}</Label><p className="mt-1 text-[11px] leading-4 text-muted-foreground">{t("promptBindingsHelp")}</p></div></div>
              <div className="space-y-2">
                {form.nodes.map((node) => {
                  const template = catalogForKind(form.kind).find((item) => item.activity === node.activity)
                  if (!template) return null
                  const BindIcon = nodeIcon(template.icon)
                  return (
                    <div key={node.id} className="rounded-xl border border-border bg-background p-3">
                      <div className="flex items-center gap-2 text-sm font-medium"><BindIcon className="h-3.5 w-3.5 text-muted-foreground" />{t(node.titleKey)}<span className="text-xs font-normal text-muted-foreground">{node.id}</span></div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <label className="grid gap-1">
                          <span className="text-[11px] text-muted-foreground">{t("wholeNodePrompt")}</span>
                          <select value={promptBundle[node.id] || ""} onChange={(event) => setPromptBinding(node.id, "", event.target.value)} className="h-8 rounded-lg border border-border bg-background px-2 text-xs">
                            <option value="">{t("noBinding")}</option>
                            {releasedPromptOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        </label>
                        {(template.promptSlots || []).map((slot) => (
                          <label key={slot} className="grid gap-1">
                            <span className="text-[11px] text-muted-foreground">{t(`slot_${slot.replace(/-/g, "_")}`)}</span>
                            <select value={promptBundle[`${node.id}:${slot}`] || ""} onChange={(event) => setPromptBinding(node.id, slot, event.target.value)} className="h-8 rounded-lg border border-border bg-background px-2 text-xs">
                              <option value="">{t("noBinding")}</option>
                              {releasedPromptOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
                {releasedPromptOptions.length === 0 && <p className="text-xs text-muted-foreground">{t("noReleasedPrompts")}</p>}
                <details className="rounded-xl border border-border bg-background p-3">
                  <summary className="cursor-pointer text-xs font-medium text-muted-foreground">{t("advancedJson")}</summary>
                  <Textarea id="workflow-prompt-bundle" className="mt-2 min-h-24 font-mono text-xs" value={promptBundleText} onChange={(event) => setPromptBundleText(event.target.value)} placeholder={'{"generate_fragment":"ptv_..."}'} />
                </details>
              </div>
            </div>
          </div>
        </section>

        <div className="grid xl:grid-cols-[290px_minmax(430px,1fr)_350px]">
          <aside className="border-b border-border bg-[#fbfbfa] p-5 xl:border-b-0 xl:border-r">
            <section><div className="mb-4 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-background">1</span><div><h2 className="text-sm font-semibold">{t("workflowDetails")}</h2><p className="text-xs text-muted-foreground">{t("workflowDetailsHelp")}</p></div></div><div className="space-y-3">
              <div className="rounded-xl border border-border bg-background p-3"><p className="text-xs font-medium text-muted-foreground">{t("workflowKind")}</p><div className="mt-2 grid grid-cols-3 gap-2">{(["storyboard", "fragment", "storyboardBranch"] as WorkflowKind[]).map((kind) => <button key={kind} type="button" disabled={!!editing} onClick={() => selectKind(kind)} className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${form.kind === kind ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary/50"}`}>{t(`kind.${kind}`)}</button>)}</div></div>
              <div className="rounded-xl border border-border bg-background p-3"><p className="text-xs font-medium text-muted-foreground">{t("basicsGroup")}</p><div className="mt-2.5 space-y-3"><div><Label htmlFor="workflow-key" className="text-xs">{t("key")}</Label><Input id="workflow-key" className="mt-1.5" disabled={!!editing} value={form.key} onChange={(event) => setForm({ ...form, key: event.target.value })} placeholder={form.kind === "fragment" ? "fragment_generation" : form.kind === "storyboardBranch" ? "storyboard_branch" : "storyboard_generation"} /></div><div><Label htmlFor="workflow-name" className="text-xs">{t("name")}</Label><Input id="workflow-name" className="mt-1.5" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={t("namePlaceholder")} /></div><div><Label htmlFor="workflow-description" className="text-xs">{t("workflowDescription")}</Label><Textarea id="workflow-description" className="mt-1.5 min-h-20" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder={t("descriptionPlaceholder")} /></div></div></div>
            </div></section>
            <div className="my-6 border-t border-border" />
            <section><div className="mb-4 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-[11px] font-semibold">2</span><div><h2 className="text-sm font-semibold">{t("settingsTableTitle")}</h2><p className="text-xs text-muted-foreground">{t("executionPolicyHelp")}</p></div></div><div className="space-y-3"><div className="rounded-xl border border-border bg-background p-3"><div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-muted-foreground" /><Label htmlFor="workflow-duration" className="text-xs">{t("maxDuration")}</Label></div><Input id="workflow-duration" className="mt-2" type="number" min="0.0834" max="12" step="0.0834" value={form.settings.maxDurationHours} onChange={(event) => setForm((current) => ({ ...current, settings: { ...current.settings, maxDurationHours: event.target.value } }))} /><p className="mt-1 text-[11px] text-muted-foreground">{t("maxDurationHelp")}</p></div><div className="grid grid-cols-2 gap-2"><div className="rounded-xl border border-border bg-background p-3"><Label htmlFor="workflow-parallelism" className="text-xs">{t("maxParallelism")}</Label><Input id="workflow-parallelism" className="mt-2" type="number" min="1" max="32" step="1" value={form.settings.maxParallelism} onChange={(event) => setForm((current) => ({ ...current, settings: { ...current.settings, maxParallelism: event.target.value } }))} /></div><div className="rounded-xl border border-border bg-background p-3"><Label htmlFor="workflow-attempts" className="text-xs">{t("maxAttempts")}</Label><Input id="workflow-attempts" className="mt-2" type="number" min="1" max="10" step="1" value={form.settings.maxAttempts} onChange={(event) => setForm((current) => ({ ...current, settings: { ...current.settings, maxAttempts: event.target.value } }))} /></div></div></div></section>
          </aside>

          <main onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event)} className="min-h-[720px] border-b border-border bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.045),_transparent_42%)] px-5 py-6 xl:border-b-0">
            <div className="mx-auto max-w-2xl"><div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t("canvasKicker")}</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">{t("sequenceTitle")}</h2><p className="mt-1 max-w-lg text-sm text-muted-foreground">{t("sequenceHelp")}</p></div><Badge variant={workflowReady ? "secondary" : "outline"}>{workflowReady ? t("pathReady") : t("pathNeedsAttention")}</Badge></div>
              {availableNodes.length > 0 && <div className="mb-5 rounded-xl border border-dashed border-border bg-background/80 p-3"><p className="mb-2 text-xs font-medium text-muted-foreground">{t("optionalNodes")}</p><div className="flex flex-wrap gap-2">{availableNodes.map((node) => { const Icon = nodeIcon(node.icon); return <button key={node.id} draggable onDragStart={(event) => { event.dataTransfer.setData("application/x-workflow-activity", node.activity); setDraggedNodeID(node.id) }} onClick={() => appendNode(node)} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-xs transition-colors hover:border-primary/50 hover:bg-secondary"><Icon className="h-3.5 w-3.5 text-primary" /><span className="font-medium">{t(node.titleKey)}</span><Plus className="h-3.5 w-3.5 text-muted-foreground" /></button> })}</div></div>}
              <div className="mb-2 flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background"><CircleCheck className="h-3.5 w-3.5 text-emerald-600" /></span><span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{t("workflowStart")}</span></div>
              <div className="space-y-0">{form.nodes.map((node, index) => { const Icon = nodeIcon(node.icon); const isSelected = selectedNodeID === node.id; const nodeTemplate = catalogForKind(form.kind).find((item) => item.activity === node.activity); const defaults = nodeInputDefaults(node); const defaultsInvalid = Boolean(node.configText.trim()) && node.configText.trim() !== "{}" && Object.keys(defaults).length === 0;
                return <div key={node.id} className="relative grid grid-cols-[28px_minmax(0,1fr)] gap-3"><div className="flex flex-col items-center"><div className={`mt-6 h-3 w-3 rounded-full border-2 transition-colors ${isSelected ? "border-primary bg-primary ring-4 ring-primary/15" : "border-border bg-background"}`} /><div className="min-h-10 w-px flex-1 bg-border" /></div><div draggable onDragStart={(event) => { event.dataTransfer.setData("application/x-workflow-node", node.id); setDraggedNodeID(node.id) }} onDragEnd={() => setDraggedNodeID(null)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, node.id)} onClick={() => setSelectedNodeID(node.id)} className={`group mb-3 cursor-pointer rounded-2xl border bg-card p-4 transition-all ${isSelected ? "border-primary/60 shadow-[0_10px_28px_rgba(28,28,26,0.10)] ring-1 ring-primary/20" : "border-border hover:border-primary/40 hover:shadow-[0_4px_16px_rgba(28,28,26,0.06)]"} ${draggedNodeID === node.id ? "opacity-45" : ""}`}><div className="flex items-start gap-3"><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${toneGradient[node.tone]}`}><Icon className="h-5 w-5 text-[#4A493E]" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[11px] font-semibold tabular-nums text-muted-foreground/70">{String(index + 1).padStart(2, "0")}</span><h3 className="text-sm font-semibold tracking-tight">{t(node.titleKey)}</h3>{node.required && <Badge variant="outline" className="h-5 border-amber-200 bg-amber-50 px-2 text-[10px] text-amber-800">{t("required")}</Badge>}</div><p className="mt-1 text-xs leading-5 text-muted-foreground">{t(node.descriptionKey)}</p>{defaultsInvalid ? <p className="mt-3 rounded-lg bg-muted/55 px-3 py-2 font-mono text-xs leading-5 text-foreground">{node.configText}</p> : Object.keys(defaults).length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{Object.entries(defaults).map(([key, value]) => { const field = nodeTemplate?.fields?.find((candidate) => candidate.key === key); const display = typeof value === "boolean" ? t(value ? "fieldTrue" : "fieldFalse") : String(value); return <span key={key} className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/70 px-2 py-0.5 text-[11px] text-foreground/85"><span className="text-muted-foreground">{field ? t(field.labelKey) : key}</span>{display}</span> })}</div>}</div><div className="flex shrink-0 items-center gap-1 opacity-70 transition-opacity group-hover:opacity-100"><Button size="icon" variant="ghost" className="h-8 w-8 cursor-grab" aria-label={t("dragNode")}><GripVertical className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="h-8 w-8" disabled={index === 0} aria-label={t("moveUp")} onClick={(event) => { event.stopPropagation(); moveNodeByOffset(node.id, -1) }}><ArrowUp className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" className="h-8 w-8" disabled={index === form.nodes.length - 1} aria-label={t("moveDown")} onClick={(event) => { event.stopPropagation(); moveNodeByOffset(node.id, 1) }}><ArrowDown className="h-3.5 w-3.5" /></Button>{!node.required && <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={t("removeNode")} onClick={(event) => { event.stopPropagation(); removeNode(node.id) }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}</div></div></div></div> })}</div>
              {form.nodes.length === 0 && <div className="rounded-xl border border-dashed border-border bg-background/70 px-6 py-16 text-center"><Workflow className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-3 text-sm font-medium">{t("dropNodeHere")}</p><p className="mt-1 text-xs text-muted-foreground">{t("dropNodeHereHelp")}</p></div>}
              <div className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background"><CircleDashed className="h-3.5 w-3.5 text-muted-foreground" /></span><span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{t("workflowFinish")}</span></div>
            </div>
          </main>

          <aside className="bg-background p-5 xl:border-l xl:border-border"><div className="mb-5 flex items-center gap-2"><Settings2 className="h-4 w-4 text-muted-foreground" /><div><h2 className="text-sm font-semibold">{t("inspectorTitle")}</h2><p className="text-xs text-muted-foreground">{t("inspectorHelp")}</p></div></div>{selectedNode && selectedTemplate ? <section className="rounded-2xl border border-border bg-card p-4"><div className="flex items-start gap-3">{(() => { const Icon = nodeIcon(selectedTemplate.icon); return <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${toneGradient[selectedTemplate.tone]}`}><Icon className="h-5 w-5 text-[#4A493E]" /></div> })()}<div className="min-w-0"><h3 className="text-sm font-semibold tracking-tight">{t(selectedNode.titleKey)}</h3><p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{selectedNode.activity}</p></div></div><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-lg bg-muted/55 p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{t("stepOrder")}</p><p className="mt-1 text-sm font-medium">{form.nodes.findIndex((node) => node.id === selectedNode.id) + 1}</p></div><div className="rounded-lg bg-muted/55 p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{t("stepDependency")}</p><p className="mt-1 truncate text-sm font-medium">{form.nodes.findIndex((node) => node.id === selectedNode.id) === 0 ? t("noDependency") : t(form.nodes[form.nodes.findIndex((node) => node.id === selectedNode.id) - 1].titleKey)}</p></div></div>{(selectedTemplate.fields?.length || 0) > 0 && <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3"><p className="text-xs font-semibold">{t("runtimeInputs")}</p><div className="mt-2 space-y-2">{(selectedTemplate.fields || []).map((field) => {
              const current = nodeInputDefaults(selectedNode)[field.key]
              const unsetOption = <option value="">{t("fieldUnset")}</option>
              return <div key={field.key} className="rounded-lg border border-border bg-background p-2.5"><Label className="text-[11px] font-normal text-muted-foreground">{t(field.labelKey)}</Label>{field.type === "boolean" ? <select value={current === undefined || current === null ? "" : String(current)} onChange={(event) => setNodeInputDefault(selectedNode.id, field.key, event.target.value === "" ? "" : event.target.value === "true")} className="mt-1.5 h-8 w-full rounded-lg border border-border px-2 text-sm">{unsetOption}<option value="true">{t("fieldTrue")}</option><option value="false">{t("fieldFalse")}</option></select> : field.type === "select" ? <select value={typeof current === "string" ? current : ""} onChange={(event) => setNodeInputDefault(selectedNode.id, field.key, event.target.value)} className="mt-1.5 h-8 w-full rounded-lg border border-border px-2 text-sm">{unsetOption}{(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}</select> : <input type={field.type === "number" ? "number" : "text"} value={current === undefined || current === null ? "" : String(current)} onChange={(event) => setNodeInputDefault(selectedNode.id, field.key, field.type === "number" ? (event.target.value === "" ? "" : Number(event.target.value)) : event.target.value)} className="mt-1.5 h-8 w-full rounded-lg border border-border px-2 text-sm" />}</div>
            })}</div><details className="mt-2"><summary className="cursor-pointer text-xs font-medium text-muted-foreground">{t("advancedJson")}</summary><Textarea id="node-operating-note" className="mt-2 min-h-36 resize-y bg-background font-mono text-xs" value={selectedNode.configText} onChange={(event) => updateNode(selectedNode.id, { configText: event.target.value })} placeholder={t("nodeNotePlaceholder")} /><p className="mt-2 text-[11px] leading-4 text-muted-foreground">{t("guidancePrompts")}</p></details></div>}
            <div className="mt-3 rounded-xl border border-border bg-muted/40 p-3"><p className="text-xs font-semibold">{t("promptBindings")}</p>{(() => { const keys = Object.keys(promptBundle).filter((key) => key === selectedNode.id || key.startsWith(selectedNode.id + ":")); if (keys.length === 0) return <p className="mt-1.5 text-xs text-muted-foreground">{t("noPromptBound")}</p>; return <div className="mt-1.5 space-y-1">{keys.map((key) => { const slot = key === selectedNode.id ? null : key.slice(selectedNode.id.length + 1); const label = releasedPromptOptions.find((option) => option.value === promptBundle[key])?.label || promptBundle[key]; return <div key={key} className="flex items-center justify-between gap-2 text-xs"><span className="text-muted-foreground">{slot ? t(`slot_${slot.replace(/-/g, "_")}`) : t("wholeNodePrompt")}</span><span className="truncate font-medium text-foreground">{label}</span></div> })}</div> })()}</div>
            {(selectedTemplate.fields?.length || 0) === 0 && <><Label htmlFor="node-operating-note" className="mt-4 block">{t("nodeNote")}</Label><Textarea id="node-operating-note" className="mt-2 min-h-44 resize-y" value={selectedNode.configText} onChange={(event) => updateNode(selectedNode.id, { configText: event.target.value })} placeholder={t("nodeNotePlaceholder")} /></>}<div className="mt-4 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-900"><Layers3 className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{t("savedAsConfig")}</span></div></section> : <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{t("selectNode")}</div>}
            <section className="mt-5 rounded-xl border border-border p-4"><h3 className="text-sm font-semibold">{t("reviewTitle")}</h3><p className="mt-1 text-xs text-muted-foreground">{t("reviewHelp")}</p><div className="mt-4 space-y-3">{[[detailsReady, t("checkDetails")], [hasExecutablePath(form.nodes, form.kind), t("checkSequence")], [hasValidSettings(form.settings), t("checkPolicy")]].map(([ready, label]) => <div key={String(label)} className="flex items-center gap-2 text-xs">{ready ? <CircleCheck className="h-4 w-4 text-emerald-600" /> : <CircleDashed className="h-4 w-4 text-amber-600" />}<span className={ready ? "text-foreground" : "text-muted-foreground"}>{label}</span></div>)}</div><div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">{t("configuredSteps", { configured: configuredNodeCount, total: form.nodes.length })}</div></section>
            <section className="mt-5 rounded-xl bg-foreground p-4 text-background"><p className="text-xs font-semibold">{t("autoGeneratedTitle")}</p><p className="mt-1 text-xs leading-5 text-background/70">{t("autoGeneratedHelp")}</p></section>
          </aside>
        </div>
        </fieldset>
      </div>
      {bindingDialog}
	  {aiDialog}
    </AdminPage>
  }

  const runStatusLabel = (status: string) => ({
    pending: t("statusPending"), running: t("statusRunning"), succeeded: t("statusSucceeded"),
    failed: t("statusFailed"), cancelled: t("statusCancelled"),
  } as Record<string, string>)[status] || status
  const runStatusTone = (status: string) => status === "succeeded"
    ? "bg-emerald-600 text-white"
    : status === "failed" ? "bg-destructive text-white" : status === "running" ? "bg-amber-500 text-white" : "bg-secondary text-muted-foreground"

  const testRunDialog = <Dialog open={!!testRunTarget} onOpenChange={(value) => { if (!value) closeTestRun() }}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>{t("testRunTitle")}</DialogTitle><DialogDescription>{t("testRunHelp")}</DialogDescription></DialogHeader><div className="grid gap-3"><div className="grid grid-cols-2 gap-3"><div><Label>{t("surface")}</Label><Input className="mt-1" value={testRunForm.surface} onChange={(event) => setTestRunForm({ ...testRunForm, surface: event.target.value })} /></div><div><Label>{t("action")}</Label><Input className="mt-1" value={testRunForm.action} onChange={(event) => setTestRunForm({ ...testRunForm, action: event.target.value })} /></div></div><div><Label htmlFor="test-run-input">{t("inputJson")}</Label><Textarea id="test-run-input" className="mt-1 min-h-32 font-mono text-xs" value={testRunForm.inputText} onChange={(event) => setTestRunForm({ ...testRunForm, inputText: event.target.value })} /></div>{testRunRef.kind && <div className="rounded-xl border border-border bg-muted/40 p-3"><Label className="text-xs font-medium text-muted-foreground">{t(testRunRef.kind === "story" ? "refStory" : "refStoryboard")}</Label><select value={testRunInputRefValue(testRunRef.kind === "story" ? "storyId" : "parentStoryboardId")} onChange={(event) => setTestRunInputField(testRunRef.kind === "story" ? "storyId" : "parentStoryboardId", event.target.value)} className="mt-1.5 h-8 w-full rounded-lg border border-border bg-background px-2 text-sm"><option value="">{t("refPickPrompt")}</option>{testRunRef.options.map((option) => <option key={option.id} value={option.id}>{option.title}（{option.id.slice(0, 8)}…）</option>)}</select><p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">{t("refHint")}</p></div>}{testRunHistory.length > 0 && <div className="rounded-xl border border-border bg-muted/40 p-3"><p className="text-xs font-semibold">{t("recentTestRuns")}</p><div className="mt-2 space-y-1">{testRunHistory.map((entry) => { const record = entry as { id: string; runId: string; status: string; error?: string; output?: string; tokensUsed?: number; createdAt?: string }; return <button key={record.id} type="button" onClick={() => { setTestRun({ runId: record.runId, status: record.status, error: record.error, output: parseRunOutput(record.output), tokensUsed: record.tokensUsed ?? 0 }); loadTestRunResult(record.runId) }} className="flex w-full items-center justify-between gap-2 rounded-lg bg-background px-2.5 py-1.5 text-xs transition-colors hover:bg-secondary"><span className={`rounded-full px-2 py-0.5 font-medium ${runStatusTone(record.status)}`}>{runStatusLabel(record.status)}</span><span className="truncate text-muted-foreground">{record.createdAt ? new Date(record.createdAt).toLocaleString() : ""}</span><span className="shrink-0 text-muted-foreground">{record.tokensUsed ?? 0} tok</span></button> })}</div></div>}{testRunHistory.length === 0 && <p className="text-xs text-muted-foreground">{t("noTestRuns")}</p>}{testRun && <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3 text-xs"><div className="flex items-center justify-between gap-2"><span className="text-muted-foreground">{t("runIdLabel")}</span><span className="truncate font-mono">{testRun.runId}</span></div><div className="flex items-center justify-between gap-2"><span className="text-muted-foreground">{t("runStatus")}</span><span className={`rounded-full px-2.5 py-0.5 font-medium ${runStatusTone(testRun.status)}`}>{runStatusLabel(testRun.status)}</span></div>{(testRun.tokensUsed ?? 0) > 0 && <div className="flex items-center justify-between gap-2"><span className="text-muted-foreground">{t("runTokens")}</span><span className="font-medium">{testRun.tokensUsed ?? 0}</span></div>}{testRun.error && <div><p className="text-muted-foreground">{t("runError")}</p><p className="mt-1 rounded-lg bg-[var(--status-danger-bg)] p-2 leading-5 text-[var(--status-danger)]">{testRun.error ?? ""}</p></div>}{testRun.output ? Object.keys(testRun.output as Record<string, unknown>).length > 0 && <div><p className="text-muted-foreground">{t("runOutput")}</p><pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-background p-2 font-mono text-[11px] leading-5">{JSON.stringify(testRun.output, null, 2)}</pre></div> : null}</div>}{testRunResult && (() => { const branches = (testRunResult.branches as Array<Record<string, unknown>>) || []; const storyboards = (testRunResult.storyboards as Array<Record<string, unknown>>) || []; if (branches.length === 0 && storyboards.length === 0) return <div className="rounded-xl border border-border bg-background p-3"><p className="text-xs text-muted-foreground">{t("noArtifacts")}</p></div>; return <div className="space-y-3">{branches.length > 0 && <div className="rounded-xl border border-border bg-background p-3"><p className="text-xs font-semibold">{t("branchCandidates")}</p><div className="mt-2 grid gap-2">{branches.map((branch, index) => { const sb = branch.storyboard as Record<string, unknown> | undefined; return <div key={index} className="rounded-lg border border-border bg-muted/40 p-2.5"><div className="flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full bg-secondary px-2 py-0.5 font-medium">{String(branch.strategy || "")}</span>{branch.narrativeHook ? <span className="text-muted-foreground">{t("hook")}: {String(branch.narrativeHook)}</span> : null}{branch.storyboardId ? <a className="text-primary underline-offset-2 hover:underline" href={`/forge/storyboards?id=${String(branch.storyboardId)}`} target="_blank" rel="noreferrer">{String((sb && sb.title) || branch.storyboardId).slice(0, 24)}</a> : null}</div>{sb && sb.content ? <p className="mt-1.5 line-clamp-3 text-xs leading-5 text-foreground/85">{String(sb.content)}</p> : null}{branch.error ? <p className="mt-1.5 rounded-md bg-[var(--status-danger-bg)] px-2 py-1 text-[11px] leading-4 text-[var(--status-danger)]">{String(branch.error)}</p> : null}</div> })}</div></div>}{storyboards.length > 0 && <div className="rounded-xl border border-border bg-background p-3"><p className="text-xs font-semibold">{t("generatedStoryboards")}</p><div className="mt-2 space-y-2">{storyboards.map((sb, index) => <div key={index} className="rounded-lg border border-border bg-muted/40 p-2.5"><div className="flex flex-wrap items-center justify-between gap-2 text-xs"><span className="font-medium">{String(sb.title || sb.id)}</span><a className="text-primary underline-offset-2 hover:underline" href={`/forge/storyboards?id=${String(sb.id)}`} target="_blank" rel="noreferrer">{t("viewResult")} ↗</a></div>{sb.currentStep ? <p className="mt-1 text-[11px] text-muted-foreground">{String(sb.currentStep)}</p> : null}{sb.content ? <p className="mt-1.5 line-clamp-4 text-xs leading-5 text-foreground/85">{String(sb.content)}</p> : null}</div> )}</div></div>}</div>; })()}{testRunResult && testRunResult.run ? (() => { const runRecord = testRunResult.run as Record<string, unknown>; const input = typeof runRecord.input === "string" ? (() => { try { return JSON.parse(runRecord.input) } catch { return null } })() : null; return input ? <details className="rounded-xl border border-border bg-background p-3"><summary className="cursor-pointer text-xs font-medium text-muted-foreground">{t("runInput")}</summary><pre className="mt-1.5 max-h-32 overflow-auto font-mono text-[11px] leading-5">{JSON.stringify(input, null, 2)}</pre></details> : null })() : null}</div><DialogFooter><Button variant="outline" onClick={closeTestRun}>{t("cancel")}</Button><Button disabled={saving || !testRunTarget?.releaseId} onClick={startTestRun}>{saving ? t("saving") : t("testRunStart")}</Button></DialogFooter></DialogContent></Dialog>

  const visibleItems = statusFilter === "all" ? items : items.filter((item) => item.status === statusFilter)

  return <AdminPage>
    <PageHeader title={t("title")} description={t("description")} icon={Workflow} actions={<Button onClick={openCreate} className="rounded-full"><Plus className="mr-2 h-4 w-4" />{t("newWorkflow")}</Button>} />
    <div className="flex flex-wrap items-center gap-2">
      {([["all", Layers3], ["draft", Pencil], ["reviewing", Clock3], ["approved", CircleCheck], ["released", Rocket]] as const).map(([status, ChipIcon]) => {
        const selected = statusFilter === status
        return <button key={status} type="button" onClick={() => setStatusFilter(status)} className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${selected ? "border-transparent bg-[#1c1c1a] text-white" : "border-border bg-white text-foreground/75 hover:bg-accent"}`}><ChipIcon className="h-3.5 w-3.5" />{status === "all" ? t("all") : t(`status.${status}`)}<span className={`text-xs ${selected ? "text-white/70" : "text-muted-foreground"}`}>{status === "all" ? items.length : counts[status] || 0}</span></button>
      })}
    </div>
    {loading ? <PageSkeleton /> : <div className="grid gap-4 xl:grid-cols-2">{visibleItems.map((item) => {
      const active = Boolean(item.releaseId && activeReleaseIds.has(item.releaseId))
      const stats = item.releaseId ? releaseStats[item.releaseId] : undefined
      const itemKind = workflowKindFromDraft(item)
      const itemSurface = itemKind === "storyboardBranch" ? "voyager.storyboard" : `voyager.${itemKind}`
      const itemAction = itemKind === "storyboardBranch" ? "branch" : "generate"
      const anotherReleaseActive = activeBindings.some((entry) => entry.binding.surface === itemSurface && entry.binding.action === itemAction && entry.release.id !== item.releaseId)
      const kindTemplates = templatesForKind(itemKind)
      const KindIcon = itemKind === "fragment" ? FileText : itemKind === "storyboardBranch" ? Layers3 : ImageIcon
      const kindGradient = itemKind === "fragment" ? "from-sky-100 to-indigo-100" : itemKind === "storyboardBranch" ? "from-emerald-100 to-teal-100" : "from-amber-100 to-rose-100"
      const statusPill = item.status === "reviewing" ? "border-amber-200 bg-amber-50 text-amber-800" : item.status === "approved" ? "border-sky-200 bg-sky-50 text-sky-800" : item.status === "released" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-[#E5E2D2] bg-white text-[#6B6A5E]"
      const primaryPill = "rounded-full"
      return <Card key={item.id} className="rounded-[20px] bg-card shadow-none">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${kindGradient}`}><KindIcon className="h-6 w-6 text-[#4A493E]" /></div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-semibold tracking-tight">{item.name}</h3>
              <p className="mt-1 truncate text-sm text-muted-foreground">{item.description || t("noDescription")}</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span className={`rounded-full border px-2.5 py-0.5 font-medium ${statusPill}`}>{t(`status.${item.status}`)}</span>
                {active && <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 font-medium text-white">{t("active")}</span>}
                <span className="h-3 w-px bg-[#E4E1D0]" />
                <span>{item.key}:v{item.version} · rev {item.revision}</span>
                {stats && <><span className="h-3 w-px bg-[#E4E1D0]" /><span>{t("runs30d")} {stats.totalRuns} · {Math.round(stats.successRate * 100)}% {t("successRate")}</span></>}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {(item.status === "draft" || item.status === "rejected") && <Button size="sm" className={primaryPill} onClick={() => act(item, "submit")}><Send className="mr-1 h-3.5 w-3.5" />{t("submit")}</Button>}
              {item.status === "reviewing" && <Button size="sm" className={primaryPill} onClick={() => act(item, "approve")}><Check className="mr-1 h-3.5 w-3.5" />{t("approve")}</Button>}
              {item.status === "approved" && <Button size="sm" className={primaryPill} onClick={() => openBinding(item)}><Rocket className="mr-1 h-3.5 w-3.5" />{t("publishAndBind")}</Button>}
              {item.status === "released" && !active && <Button size="sm" className={primaryPill} onClick={() => openBinding(item)}>{anotherReleaseActive ? <RotateCcw className="mr-1 h-3.5 w-3.5" /> : <Link className="mr-1 h-3.5 w-3.5" />}{t(anotherReleaseActive ? "rollbackToVersion" : "bind")}</Button>}
              {active && <Button size="sm" variant="destructive" className="rounded-full" disabled={saving} onClick={() => pauseRelease(item)}><PauseCircle className="mr-1 h-3.5 w-3.5" />{t("pauseRouting")}</Button>}
              <div className="flex flex-wrap justify-end gap-1.5">
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => openView(item)}><Eye className="mr-1 h-3.5 w-3.5" />{t("view")}</Button>
                {(item.status === "draft" || item.status === "rejected") && <Button size="sm" variant="outline" className="rounded-full" onClick={() => openEdit(item)}><Pencil className="mr-1 h-3.5 w-3.5" />{t("edit")}</Button>}
                {item.status === "reviewing" && <Button size="sm" variant="outline" className="rounded-full" onClick={() => act(item, "reject")}><X className="mr-1 h-3.5 w-3.5" />{t("reject")}</Button>}
                {item.status === "released" && item.releaseId && <Button size="sm" variant="outline" className="rounded-full" onClick={() => openTestRun(item)}><Play className="mr-1 h-3.5 w-3.5" />{t("testRun")}</Button>}
                {item.status === "released" && <Button size="sm" variant="outline" className="rounded-full" disabled={saving} onClick={() => cloneNextVersion(item)}><CopyPlus className="mr-1 h-3.5 w-3.5" />{t("newVersion")}</Button>}
              </div>
            </div>
          </div>
          <div className="mt-4 border-t border-[#EAE7D8] pt-3">
            <p className="text-xs text-muted-foreground">{t("nodesIncluded")}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.definition.nodes.map((node, index) => {
                const template = kindTemplates.find((candidate) => candidate.activity === node.activity)
                if (!template) return null
                const ChipIcon = nodeIcon(template.icon)
                return <span key={`${node.id}-${index}`} className="inline-flex items-center gap-1.5 rounded-full border border-[#E7E4D5] bg-white px-3 py-1 text-xs text-foreground/85"><ChipIcon className="h-3 w-3 text-muted-foreground" />{t(template.titleKey)}</span>
              })}
              <button type="button" onClick={() => openView(item)} className="inline-flex items-center gap-1 rounded-full border border-[#E7E4D5] bg-white px-3 py-1 text-xs text-foreground/85 transition-colors hover:bg-accent"><ArrowUpRight className="h-3 w-3 text-muted-foreground" />{t("viewMore")}</button>
            </div>
          </div>
        </CardContent>
      </Card>
    })}{visibleItems.length === 0 && <p className="text-sm text-muted-foreground">{t("empty")}</p>}</div>}
    {bindingDialog}
    {testRunDialog}
  </AdminPage>
}
