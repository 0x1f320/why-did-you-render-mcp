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
import type { CommitSummary, RenderWithProject, StoredRender } from "./types.js"
import { readJsonl } from "./utils/read-jsonl.js"
import { sanitizeProjectId } from "./utils/sanitize-project-id.js"
import { toResult } from "./utils/to-result.js"

const COMMIT_GAP_MS = 200

export class RenderStore {
  private readonly dir: string
  private commitId = 0
  private lastRenderTime = 0

  constructor(dir?: string) {
    this.dir = dir ?? join(homedir(), ".wdyr-mcp", "renders")
    mkdirSync(this.dir, { recursive: true })
  }

  addRender(report: RenderReport, projectId: string): void {
    const now = Date.now()
    if (now - this.lastRenderTime > COMMIT_GAP_MS) {
      this.commitId++
    }
    this.lastRenderTime = now

    const stored: StoredRender = {
      ...report,
      projectId,
      timestamp: now,
      commitId: this.commitId,
    }
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

  getSummary(projectId?: string): Record<string, Record<string, number>> {
    const renders = this.getAllRenders(projectId)
    const summary: Record<string, Record<string, number>> = {}

    for (const r of renders) {
      summary[r.project] ??= {}
      const project = summary[r.project]
      project[r.displayName] = (project[r.displayName] ?? 0) + 1
    }

    return summary
  }

  getCommits(projectId?: string): CommitSummary[] {
    const renders = this.getAllRenders(projectId)
    const map = new Map<
      number,
      {
        timestamp: number
        project: string
        components: Set<string>
        count: number
      }
    >()

    for (const r of renders) {
      let entry = map.get(r.commitId)
      if (!entry) {
        entry = {
          timestamp: r.timestamp,
          project: r.project,
          components: new Set(),
          count: 0,
        }
        map.set(r.commitId, entry)
      }
      entry.components.add(r.displayName)
      entry.count++
    }

    const commits: CommitSummary[] = []
    for (const [commitId, entry] of map) {
      commits.push({
        commitId,
        timestamp: entry.timestamp,
        project: entry.project,
        renderCount: entry.count,
        components: [...entry.components],
      })
    }

    return commits
  }

  getRendersByCommit(
    commitId: number,
    projectId?: string,
  ): RenderWithProject[] {
    return this.getAllRenders(projectId).filter((r) => r.commitId === commitId)
  }

  private projectFile(projectId: string): string {
    return join(this.dir, `${sanitizeProjectId(projectId)}.jsonl`)
  }

  private jsonlFiles(): string[] {
    return readdirSync(this.dir).filter((f) => f.endsWith(".jsonl"))
  }
}
