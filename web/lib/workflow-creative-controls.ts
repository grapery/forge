export const creativeControlOptions = {
  pacing: ["balanced", "slow", "fast"],
  dialogueDensity: ["balanced", "sparse", "rich"],
  visualEmphasis: ["balanced", "atmosphere", "action", "character"],
  tone: ["neutral", "warm", "tense", "playful"],
} as const

export type CreativeControlField = keyof typeof creativeControlOptions
export type CreativeControls = {
  version: 1
  pacing: typeof creativeControlOptions.pacing[number]
  dialogueDensity: typeof creativeControlOptions.dialogueDensity[number]
  visualEmphasis: typeof creativeControlOptions.visualEmphasis[number]
  tone: typeof creativeControlOptions.tone[number]
  examples: { input: string; output: string }[]
}

export function defaultCreativeControls(): CreativeControls {
  return { version: 1, pacing: "balanced", dialogueDensity: "balanced", visualEmphasis: "balanced", tone: "neutral", examples: [] }
}

const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value)
export const creativeRuneCount = (value: string) => Array.from(value).length

export function parseCreativeControls(raw: unknown = undefined): CreativeControls {
  const defaults = defaultCreativeControls()
  if (raw === undefined) return defaults
  if (!isObject(raw)) throw new Error("creativeControls must be an object")
  const keys = new Set(["version", ...Object.keys(creativeControlOptions), "examples"])
  if (Object.keys(raw).some((key) => !keys.has(key))) throw new Error("Unknown creativeControls field")
  if (raw.version !== undefined && raw.version !== 1) throw new Error("creativeControls.version must be 1")
  const controls = { ...defaults }
  for (const key of Object.keys(creativeControlOptions) as CreativeControlField[]) {
    const value = raw[key] === undefined ? defaults[key] : raw[key]
    if (typeof value !== "string" || !(creativeControlOptions[key] as readonly string[]).includes(value)) throw new Error(`Invalid creativeControls.${key}`)
    Object.assign(controls, { [key]: value })
  }
  if (raw.examples !== undefined) {
    if (!Array.isArray(raw.examples) || raw.examples.length > 3) throw new Error("At most 3 creative examples are allowed")
    controls.examples = raw.examples.map((item) => {
      if (!isObject(item) || Object.keys(item).some((key) => key !== "input" && key !== "output")) throw new Error("Examples support only input and output")
      if (typeof item.input !== "string" || !item.input.trim() || creativeRuneCount(item.input) > 500 || typeof item.output !== "string" || !item.output.trim() || creativeRuneCount(item.output) > 1500) throw new Error("Examples need input (1–500 characters) and output (1–1500 characters)")
      return { input: item.input, output: item.output }
    })
  }
  return controls
}

export function hasValidCreativeControls(raw: unknown): boolean {
  try { parseCreativeControls(raw); return true } catch { return false }
}
