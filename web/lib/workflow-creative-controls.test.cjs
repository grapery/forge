const assert = require("node:assert/strict")
const { test } = require("node:test")
const fs = require("node:fs")
const path = require("node:path")
const ts = require("typescript")
const React = require("react")
const { renderToStaticMarkup } = require("react-dom/server")

// Exercise the actual TS/TSX modules without adding a browser runner or build
// artifact to the repository. Only local source and installed React are loaded.
const cache = new Map()
function loadSource(filename) {
  filename = path.resolve(__dirname, filename)
  if (cache.has(filename)) return cache.get(filename)
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const module = { exports: {} }
  const localRequire = (name) => {
    if (!name.startsWith(".")) return require(name)
    let target = path.resolve(path.dirname(filename), name)
    if (!path.extname(target)) target += fs.existsSync(target + ".ts") ? ".ts" : ".tsx"
    return loadSource(target)
  }
  new Function("require", "module", "exports", code)(localRequire, module, module.exports)
  cache.set(filename, module.exports)
  return module.exports
}
const { defaultCreativeControls, parseCreativeControls, creativeRuneCount } = loadSource("workflow-creative-controls.ts")
const { CreativeControlsForm } = loadSource("../components/workflows/creative-controls-form.tsx")

test("absent preferences keep engineering defaults and reject invalid enum/core overrides", () => {
  assert.deepEqual(parseCreativeControls(), defaultCreativeControls())
  assert.equal(parseCreativeControls({ tone: "warm" }).version, 1)
  for (const raw of [null, [], { version: 2 }, { version: null }, { tone: null }, { pacing: "" }, { tone: "grim" }, { systemPrompt: "override" }, { examples: null }, { examples: [{ input: "a", output: "b", permissions: "override" }] }]) assert.throws(() => parseCreativeControls(raw))
  const controls = defaultCreativeControls()
  controls.examples.push({ input: "a", output: "b" })
  assert.equal(defaultCreativeControls().examples.length, 0)
})

test("examples use Unicode character limits and require both fields", () => {
  assert.equal(creativeRuneCount("🌧雨"), 2)
  assert.equal(parseCreativeControls({ examples: [{ input: "🌧".repeat(500), output: "🌧".repeat(1500) }] }).examples.length, 1)
  for (const examples of [[{ input: " ", output: "b" }], [{ input: "a" }], [{ input: "🌧".repeat(501), output: "b" }], [{ input: "a", output: "雨".repeat(1501) }], Array.from({ length: 4 }, () => ({ input: "a", output: "b" }))]) assert.throws(() => parseCreativeControls({ examples }))
})

test("operator form renders bounded preferences and automatic defaults without prompt editing", () => {
  for (const language of ["zh", "en"]) {
    const messages = require(`../messages/${language}.json`).workflows
    const html = renderToStaticMarkup(React.createElement(CreativeControlsForm, { value: defaultCreativeControls(), onChange() {}, t: (key) => messages[key] }))
    assert.equal((html.match(/<select /g) || []).length, 4)
    for (const key of ["pacing", "dialogueDensity", "visualEmphasis", "tone"]) assert.ok(html.includes(`id="creative-${key}"`))
    assert.ok(html.includes(messages.creativeDefaultsTitle))
    assert.ok(html.includes(messages.creativeSystemManaged))
    assert.ok(html.includes(messages.creativeExamplesOptional))
    assert.equal((html.match(/<textarea/g) || []).length, 0)
    assert.ok(!html.includes("workflow-prompt-bundle"))
  }
})

test("examples render their real limits, remove actions and incomplete-state feedback", () => {
  const value = { ...defaultCreativeControls(), examples: Array.from({ length: 3 }, () => ({ input: "", output: "" })) }
  const html = renderToStaticMarkup(React.createElement(CreativeControlsForm, { value, onChange() {}, t: (key) => key }))
  assert.equal((html.match(/<textarea/g) || []).length, 6)
  assert.ok(html.includes("0/500") && html.includes("0/1500"))
  assert.ok(html.includes('role="alert"'))
  assert.ok(/<button[^>]*disabled=""[^>]*>creativeExampleAdd/.test(html))
  assert.equal((html.match(/aria-label="creativeExampleRemove /g) || []).length, 3)
})


test("creation identities and character async defaults match the engineering fixture", () => {
  const { creationWorkflowIdentity, characterCreationDefaults } = loadSource("workflow-creation-defaults.ts")
  const fixture = require("../../../grapery-agent/internal/generation/engineering_workflows.json")
  for (const kind of ["fragment", "storyboard", "character"]) {
    const workflow = fixture.find((entry) => entry.key === `engineering.${kind}`)
    assert.equal(creationWorkflowIdentity(kind).surface, workflow.manifest.surface)
    assert.equal(creationWorkflowIdentity(kind).action, workflow.manifest.action)
  }
  assert.deepEqual(characterCreationDefaults(), fixture.find((entry) => entry.key === "engineering.character").definition.nodes[0].config.inputDefaults)
  assert.equal(creationWorkflowIdentity("storyboardBranch").action, "branch")
})
