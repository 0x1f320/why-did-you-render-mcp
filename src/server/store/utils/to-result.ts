import type { RenderWithProject, StoredRender } from "../types.js"

export function toResult(stored: StoredRender): RenderWithProject {
  return {
    project: stored.projectId,
    displayName: stored.displayName,
    reason: stored.reason,
    timestamp: stored.timestamp ?? 0,
    commitId: stored.commitId ?? 0,
    ...(stored.hookName != null && { hookName: stored.hookName }),
  }
}
