import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
} from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import type { RenderReport } from "../../types.js"
import type { RenderWithProject, StoredRender } from "./types.js"
import { readJsonl } from "./utils/read-jsonl.js"
import { sanitizeProjectId } from "./utils/sanitize-project-id.js"
import { toResult } from "./utils/to-result.js"

export interface ComponentSummary {
  count: number
  reasons: {
    props: number
    state: number
    hooks: number
  }
}

export class RenderStore {
  private readonly dir: string

  constructor(dir?: string) {
    this.dir = dir ?? join(homedir(), ".wdyr-mcp", "renders")
    mkdirSync(this.dir, { recursive: true })
  }

  addRender(report: RenderReport, projectId: string): void {
    const stored: StoredRender = { ...report, projectId }
    appendFileSync(this.projectFile(projectId), `${JSON.stringify(stored)}\n`)
  }

  getAllRenders(projectId?: string): RenderWithProject[] {
    if (projectId) {
      return readJsonl(this.projectFile(projectId)).map(toResult)
    }

    return this.jsonlFiles().flatMap((f) =>
      readJsonl(join(this.dir, f)).map(toResult),
    )
  }

  getRendersByComponent(
    componentName: string,
    projectId?: string,
  ): RenderWithProject[] {
    return this.getAllRenders(projectId).filter(
      (r) => r.displayName === componentName,
    )
  }

  clearRenders(projectId?: string): void {
    if (projectId) {
      const file = this.projectFile(projectId)
      if (existsSync(file)) unlinkSync(file)
    } else {
      for (const f of this.jsonlFiles()) {
        unlinkSync(join(this.dir, f))
      }
    }
  }

  getProjects(): string[] {
    const projects = new Set<string>()

    for (const f of this.jsonlFiles()) {
      const firstLine = readFileSync(join(this.dir, f), "utf-8").split("\n")[0]
      if (!firstLine) continue
      const stored = JSON.parse(firstLine) as StoredRender
      projects.add(stored.projectId)
    }

    return [...projects]
  }

  getSummary(
    projectId?: string,
  ): Record<string, Record<string, ComponentSummary>> {
    const renders = this.getAllRenders(projectId)
    const summary: Record<string, Record<string, ComponentSummary>> = {}

    for (const r of renders) {
      summary[r.project] ??= {}
      const project = summary[r.project]
      project[r.displayName] ??= {
        count: 0,
        reasons: { props: 0, state: 0, hooks: 0 },
      }
      const entry = project[r.displayName]
      entry.count += 1

      const { reason } = r
      if (
        Array.isArray(reason.propsDifferences) &&
        reason.propsDifferences.length > 0
      ) {
        entry.reasons.props += 1
      }
      if (
        Array.isArray(reason.stateDifferences) &&
        reason.stateDifferences.length > 0
      ) {
        entry.reasons.state += 1
      }
      if (
        Array.isArray(reason.hookDifferences) &&
        reason.hookDifferences.length > 0
      ) {
        entry.reasons.hooks += 1
      }
    }

    return summary
  }

  private projectFile(projectId: string): string {
    return join(this.dir, `${sanitizeProjectId(projectId)}.jsonl`)
  }

  private jsonlFiles(): string[] {
    return readdirSync(this.dir).filter((f) => f.endsWith(".jsonl"))
  }
}
