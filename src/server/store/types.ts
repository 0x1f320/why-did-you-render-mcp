import type { RenderReport } from "../../types.js"

export interface StoredRender extends RenderReport {
  projectId: string
  commitId?: number
}

export type BufferMeta = Pick<StoredRender, "projectId" | "commitId">

export interface ParsedFilename {
  projectSanitized: string
  commitId?: number
}

export interface RenderWithProject extends RenderReport {
  project: string
  commitId?: number
}
