export type WorkflowKind = "storyboard" | "fragment" | "character" | "storyboardBranch"

export function creationWorkflowIdentity(kind: WorkflowKind) {
  return { surface: kind === "storyboardBranch" ? "voyager.storyboard" : `voyager.${kind}`, action: kind === "storyboardBranch" ? "branch" : "generate" }
}

export function characterCreationDefaults() {
  return { useAsyncTask: true, createRecord: true, generatePortrait: true, generateAvatar: true, generateThreeViews: true }
}
