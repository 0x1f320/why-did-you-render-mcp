import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import type { RenderReport } from "../../types.js"
import type { RenderWithProject, StoredRender } from "./types.js"
import { readJsonl } from "./utils/read-jsonl.js"
import { sanitizeProjectId } from "./utils/sanitize-project-id.js"
import { toResult } from "./utils/to-result.js"
import {
  DICT_KEY,
  type ValueDict,
  dehydrate,
  ensureReady,
} from "./utils/value-dict.js"

const FLUSH_DELAY_MS = 200

export class RenderStore {
  private readonly dir: string
  private readonly buffers = new Map<string, StoredRender[]>()
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>()
  private readonly dicts = new Map<string, ValueDict>()

  constructor(dir?: string) {
    this.dir = dir ?? join(homedir(), ".wdyr-mcp", "renders")
    mkdirSync(this.dir, { recursive: true })
  }

  addRender(report: RenderReport, projectId: string, commitId?: number): void {
    const stored: StoredRender = {
      ...report,
      projectId,
      ...(commitId != null && { commitId }),
    }

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
      setTimeout(() => {
        this.flushAsync(projectId).catch((err) =>
          console.error(`[wdyr-mcp] flush error for ${projectId}:`, err),
        )
      }, FLUSH_DELAY_MS),
    )
  }

  async flushAsync(projectId?: string): Promise<void> {
    await ensureReady()
    if (projectId) {
      this.flushProject(projectId)
    } else {
      for (const id of this.buffers.keys()) {
        this.flushProject(id)
      }
    }
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

    let dict = this.dicts.get(projectId)
    if (!dict) {
      dict = {}
      this.dicts.set(projectId, dict)
    }

    const dehydrated = buf.map((r) => dehydrate(r, dict))

    // Read existing data lines (skip old dict line)
    const file = this.projectFile(projectId)
    const existingLines = this.readDataLines(file)

    // Rewrite: dict line + existing data + new data
    const newLines = dehydrated.map((r) => JSON.stringify(r))
    const allDataLines = [...existingLines, ...newLines]

    const hasDictEntries = Object.keys(dict).length > 0
    const parts = hasDictEntries
      ? [JSON.stringify({ [DICT_KEY]: dict }), ...allDataLines]
      : allDataLines

    writeFileSync(file, `${parts.join("\n")}\n`)

    buf.length = 0
    const timer = this.timers.get(projectId)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(projectId)
    }
  }

  private readDataLines(file: string): string[] {
    if (!existsSync(file)) return []
    return readFileSync(file, "utf-8")
      .split("\n")
      .filter((line) => {
        if (!line) return false
        if (line.startsWith(`{"${DICT_KEY}"`)) return false
        return true
      })
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
      this.dicts.delete(projectId)
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
      this.dicts.clear()
      for (const f of this.jsonlFiles()) {
        unlinkSync(join(this.dir, f))
      }
    }
  }

  getProjects(): string[] {
    this.flush()
    const projects = new Set<string>()

    for (const f of this.jsonlFiles()) {
      const lines = readFileSync(join(this.dir, f), "utf-8").split("\n")
      for (const line of lines) {
        if (!line) continue
        const parsed = JSON.parse(line)
        if (DICT_KEY in parsed) continue
        projects.add((parsed as StoredRender).projectId)
        break
      }
    }

    return [...projects]
  }

  getCommitIds(projectId?: string): number[] {
    const renders = this.getAllRenders(projectId)
    return [
      ...new Set(
        renders.map((r) => r.commitId).filter((id): id is number => id != null),
      ),
    ]
  }

  getRendersByCommit(
    commitId: number,
    projectId?: string,
  ): RenderWithProject[] {
    return this.getAllRenders(projectId).filter((r) => r.commitId === commitId)
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
