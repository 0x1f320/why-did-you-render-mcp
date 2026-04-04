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

const FLUSH_DELAY_MS = 200

export class RenderStore {
  private readonly dir: string
  private readonly buffers = new Map<string, StoredRender[]>()
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>()

  constructor(dir?: string) {
    this.dir = dir ?? join(homedir(), ".wdyr-mcp", "renders")
    mkdirSync(this.dir, { recursive: true })
  }

  addRender(report: RenderReport, projectId: string): void {
    const stored: StoredRender = { ...report, projectId }

    let buf = this.buffers.get(projectId)
    if (!buf) {
      buf = []
      this.buffers.set(projectId, buf)
    }
    buf.push(stored)

    const existing = this.timers.get(projectId)
    if (existing) clearTimeout(existing)

    this.timers.set(
      projectId,
      setTimeout(() => this.flush(projectId), FLUSH_DELAY_MS),
    )
  }

  flush(projectId?: string): void {
    if (projectId) {
      this.flushProject(projectId)
    } else {
      for (const id of this.buffers.keys()) {
        this.flushProject(id)
      }
    }
  }

  private flushProject(projectId: string): void {
    const buf = this.buffers.get(projectId)
    if (!buf || buf.length === 0) return

    const lines = buf.map((s) => JSON.stringify(s)).join("\n")
    appendFileSync(this.projectFile(projectId), `${lines}\n`)

    buf.length = 0
    const timer = this.timers.get(projectId)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(projectId)
    }
  }

  getAllRenders(projectId?: string): RenderWithProject[] {
    this.flush(projectId)

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
      this.buffers.delete(projectId)
      const timer = this.timers.get(projectId)
      if (timer) {
        clearTimeout(timer)
        this.timers.delete(projectId)
      }
      const file = this.projectFile(projectId)
      if (existsSync(file)) unlinkSync(file)
    } else {
      for (const [id, timer] of this.timers) {
        clearTimeout(timer)
      }
      this.buffers.clear()
      this.timers.clear()
      for (const f of this.jsonlFiles()) {
        unlinkSync(join(this.dir, f))
      }
    }
  }

  getProjects(): string[] {
    this.flush()
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

  private projectFile(projectId: string): string {
    return join(this.dir, `${sanitizeProjectId(projectId)}.jsonl`)
  }

  private jsonlFiles(): string[] {
    return readdirSync(this.dir).filter((f) => f.endsWith(".jsonl"))
  }
}
