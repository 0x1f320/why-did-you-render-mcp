import type { RenderReport } from "../../types.js"

export interface StoredRender extends RenderReport {
  projectId: string
  timestamp: number
  commitId: number
}

export interface RenderWithProject extends RenderReport {
  project: string
  timestamp: number
  commitId: number
}

export interface CommitSummary {
  commitId: number
  timestamp: number
  project: string
  renderCount: number
  components: string[]
}
