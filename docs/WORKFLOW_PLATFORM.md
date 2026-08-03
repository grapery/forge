# Workflow Platform v1

This document describes the first executable workflow release across Forge,
Grapery, grapery-agent, and Voyager.

## Ownership

- Forge owns mutable drafts, review, permissions, approval, publishing, and
  product bindings.
- Grapery owns immutable workflow/prompt releases, the catalog, durable run
  snapshots, events, checkpoints, and Redis leases.
- grapery-agent compiles and executes the pinned release. Runtime v1 accepts
  only registered `activity` and `persist` nodes.
- Voyager discovers the active binding for a product surface/action and pins
  that release when it starts a generation.

## Release path

1. An operator with `workflow-edit` creates or edits a draft in Forge.
2. A different operator with `workflow-review` approves it.
3. An operator with `workflow-publish` publishes the immutable release and
   creates a binding.
4. Voyager queries `GET /api/v1/workflows/catalog` for a stable surface/action.
5. grapery-agent resolves the binding again before execution. A client cannot
   execute an unbound release by guessing its ID.
6. The run stores the release ID, workflow key/version/checksum, prompt bundle,
   and the complete immutable prompt snapshots resolved for each bound node.
   A later release cannot mutate an existing run.

Released workflows expose **Create Next Version** in Forge. This copies only
the executable manifest, definition, prompt bundle, and policies into a new
draft; approval and release metadata are reset. Product bindings use a stable
identity derived from surface, action, tenant, workflow key, and priority, so
publishing an upgrade or rolling back to an older release updates the same
logical binding instead of accumulating ambiguous same-priority records.
Forge reads the runtime catalog and marks the first effective release as
**Active** on the workflow list; rebinding an older released card is the
operator rollback path.

## Prompt release path

1. An operator with `prompt-edit` creates a typed prompt draft in Forge.
2. A different operator with `prompt-review` approves or rejects it.
3. An operator with `prompt-publish` publishes an immutable prompt version to
   Grapery.
4. A workflow release maps either a node ID or a `node:slot` key to published
   prompt-version IDs. Node-only keys remain the backward-compatible default.
5. grapery-agent resolves every referenced version before creating the run,
   rejects missing or invalid versions, stores the full snapshots durably, and
   supplies the node default as `config.promptTemplate` and named slots as
   `config.promptTemplates[slot]` to its registered activity.
6. Recovery uses the pinned snapshot and validates its ID/checksum. Older v1
   checkpoints are upgraded by resolving their already-pinned immutable IDs.

Released prompt templates also expose **Create Next Version**. Editing the new
draft never mutates prompt snapshots already pinned by running or historical
workflow releases; a workflow's next version opts into the new prompt version
through its prompt bundle.

The first Voyager contract is:

```text
surface: voyager.storyboard
action:  generate
```

If there is no active binding, Voyager falls back to the legacy storyboard
creation stream. This provides a safe rollout and rollback path.

## Long-running execution

- Maximum workflow duration: 43,200 seconds (12 hours).
- Every completed node writes a durable checkpoint.
- Checkpoint writes carry the generation lease and are rejected after lease
  loss.
- On process startup, grapery-agent scans non-terminal workflow runs, acquires
  the Redis lease, verifies the pinned checksum, and skips nodes already stored
  in the checkpoint.
- Voyager keeps storyboard recovery compatible with the existing draft and
  server progress APIs and polls against a 12-hour deadline.

## Configuration

Forge requires:

```text
GRAPERY_BASE_URL=http://grapery:8080
GRAPERY_INTERNAL_API_KEY=<same value as Grapery's internal agent-policy key>
```

grapery-agent requires `GRAPERY_API_KEY` for durable runs, checkpoints, catalog
resolution, and recovery. Production should also keep
`DURABLE_RUNTIME_REQUIRED=true`.

## Runtime v1 constraints

- Operator-authored code is not allowed. A workflow can only reference an
  activity registered in both Grapery validation and grapery-agent runtime.
- `condition`, `parallel`, `foreach`, `wait`, `human_input`, and
  `sub_workflow` are reserved in the definition contract but are rejected by
  runtime v1 until their durable semantics are implemented.
- `legacy.storyboard.generate` and the earlier three-activity workflow remain
  available for already-published releases. Newly-authored storyboard workflows
  use five durable activities: `storyboard.ensure_draft`,
  `storyboard.generate_bible_plan`, `storyboard.generate_scene_plan`,
  `storyboard.persist_content`, and `storyboard.ensure_images`.
- `ensure_draft` creates or reuses exactly one draft and persists the pinned
  workflow/prompt context. Its Grapery create request carries a deterministic
  `Idempotency-Key`, covering a crash between remote creation and local
  checkpoint persistence. Grapery recognizes the complete five-stage release
  from its immutable definition and suppresses the legacy in-process text
  pipeline for that draft. Bible and Scene Plan outputs are persisted separately
  in `StoryboardGenerationRun`; retries return the completed stage without a
  second model call. `persist_content` inserts scenes idempotently and advances
  the storyboard to `content_ready`. `ensure_images` reuses an active image job,
  skips already completed images, or starts the selected scene/comic-page path.
- Every downstream text node carries the upstream `generationRunId`; it never
  resolves a merely "latest" run when two edit turns overlap. For storyboard
  revisions, the Bible node also carries the stable `clientRequestId` and turn
  directive. Grapery keeps the old scenes visible while planning and replaces
  them only after the new Scene Plan has completed successfully.
- A partial staged definition does not suppress legacy generation. This keeps
  immutable releases published before the five-stage split executable during a
  rolling deployment. `storyboard.await_content` remains registered for those
  releases, but is no longer present in Forge's new-workflow template.
- Every activity output is checkpointed independently. A restart after draft
  creation or content completion resumes at the next node without creating a
  second storyboard or rerunning a completed node.
- Runtime policies are enforced, not merely stored. `maxAttempts` applies per
  node with cancellation-aware bounded exponential backoff. `maxDurationSeconds`
  is calculated from the checkpoint's original `startedAt`, so an agent restart
  does not reset the workflow's deadline. The default Forge storyboard template
  permits three attempts and an absolute 12-hour run. Attempt counters are
  checkpointed before side effects, so restarts also cannot reset a node's retry
  budget.
- Forge currently edits controlled JSON definitions and manifests. Prompt
  template authoring, review, publishing, RBAC, and runtime pinning are
  available; a visual graph editor remains a follow-up control-plane feature.
- Voyager resolves the workflow before creating its draft and sends only the
  release ID. Grapery independently verifies that the release is still bound to
  `voyager.storyboard/generate`, resolves the immutable prompt versions, and
  persists their full snapshots on the storyboard before background generation
  begins. Prompt contents supplied by a client are never trusted.
- The storyboard text pipeline now consumes three independent slots:
  `generate_storyboard:bible_plan`, `generate_storyboard:scene_plan`, and
  `generate_storyboard:json_repair`. The old `generate_storyboard` binding is
  still accepted as the Bible default. Each slot supplies its system/user
  templates and bounded model settings. Common Go-template variables are
  `legacySystemPrompt`, `legacyUserPrompt`, `storyJSON`, `storyboardJSON`,
  `contextJSON`, `alignmentPrompt`, and `sceneCount`; Scene Plan also receives
  `biblePlanJSON`, while JSON Repair receives `brokenOutput`, `failureDetail`,
  `step`, and `operation`. Invalid rendering falls back to the fixed legacy
  prompt and records the reason in generation metadata.
- Consistency audit is deterministic rather than an LLM call. Image prompt
  composition still follows the validated Scene Plan output. Grapery's internal
  Bible/Scene transaction remains one background content pipeline, while the
  externally durable workflow now has separate draft/content/image recovery
  boundaries.
