import type { RenderReport } from "../../types.js"

export interface StoredRender extends RenderReport {
  projectId: string
  commitId?: number
  timestamp?: number
}

export type BufferMeta = Pick<StoredRender, "projectId" | "commitId">

export interface ParsedFilename {
  projectSanitized: string
  commitId?: number
}

export interface RenderWithProject extends RenderReport {
  project: string
  commitId?: number
  timestamp?: number
}

export interface CommitInfo {
  commitId: number
  timestamp: number | null
  renderCount: number
  components: string[]
}

export interface ComponentSummary {
  count: number
  reasons: { props: number; state: number; hooks: number }
  totalDuration?: number
}

export interface SnapshotMeta {
  name: string
  timestamp: number
}

export interface Snapshot extends SnapshotMeta {
  data: Record<string, Record<string, ComponentSummary>>
}
