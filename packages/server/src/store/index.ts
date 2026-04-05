export { RenderStore } from "./render-store.js"
export { SnapshotStore } from "./snapshot-store.js"
export { ProjectRegistry } from "./project-registry.js"
export { summarize, summarizeByCommit } from "./utils/summarize.js"
export type {
  ComponentSummary,
  RenderWithProject,
  StoredRender,
} from "./types.js"

import { ProjectRegistry } from "./project-registry.js"
import { RenderStore } from "./render-store.js"
import { SnapshotStore } from "./snapshot-store.js"

export const store = new RenderStore()
export const snapshots = new SnapshotStore()
export const registry = new ProjectRegistry()
