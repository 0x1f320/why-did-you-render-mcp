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
import type {
  BufferMeta,
  ComponentSummary,
  ParsedFilename,
  RenderWithProject,
  StoredRender,
} from "./types.js"
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
const NOCOMMIT = "nocommit"

export class RenderStore {
  private readonly dir: string
  private readonly buffers = new Map<string, StoredRender[]>()
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>()
  private readonly dicts = new Map<string, ValueDict>()
  private readonly bufferMeta = new Map<string, BufferMeta>()

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

    const bk = this.bufferKey(projectId, commitId)

    let buf = this.buffers.get(bk)
    if (!buf) {
      buf = []
      this.buffers.set(bk, buf)
      this.bufferMeta.set(bk, { projectId, commitId })
    }
    buf.push(stored)

    const existing = this.timers.get(bk)
    if (existing) clearTimeout(existing)

    this.timers.set(
      bk,
      setTimeout(() => {
        this.flushAsync(projectId, commitId).catch((err) =>
          console.error(`[wdyr-mcp] flush error for ${bk}:`, err),
        )
      }, FLUSH_DELAY_MS),
    )
  }

  async flushAsync(projectId?: string, commitId?: number): Promise<void> {
    await ensureReady()
    this.flush(projectId, commitId)
  }

  flush(projectId?: string, commitId?: number): void {
    if (projectId != null && commitId !== undefined) {
      this.flushBuffer(this.bufferKey(projectId, commitId))
    } else if (projectId != null) {
      for (const bk of this.bufferKeysForProject(projectId)) {
        this.flushBuffer(bk)
      }
    } else {
      for (const bk of [...this.buffers.keys()]) {
        this.flushBuffer(bk)
      }
    }
  }

  private flushBuffer(bk: string): void {
    const buf = this.buffers.get(bk)
    if (!buf || buf.length === 0) return

    const meta = this.bufferMeta.get(bk)
    if (!meta) return

    let dict = this.dicts.get(bk)
    if (!dict) {
      dict = {}
      this.dicts.set(bk, dict)
    }

    const dehydrated = buf.map((r) => dehydrate(r, dict))

    const file = this.commitFile(meta.projectId, meta.commitId)
    const existingLines = this.readDataLines(file)

    const newLines = dehydrated.map((r) => JSON.stringify(r))
    const allDataLines = [...existingLines, ...newLines]

    const hasDictEntries = Object.keys(dict).length > 0
    const parts = hasDictEntries
      ? [JSON.stringify({ [DICT_KEY]: dict }), ...allDataLines]
      : allDataLines

    writeFileSync(file, `${parts.join("\n")}\n`)

    buf.length = 0
    const timer = this.timers.get(bk)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(bk)
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
      return this.projectFiles(projectId).flatMap((f) =>
        readJsonl(join(this.dir, f)).map(toResult),
      )
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
      for (const bk of this.bufferKeysForProject(projectId)) {
        this.buffers.delete(bk)
        this.dicts.delete(bk)
        this.bufferMeta.delete(bk)
        const timer = this.timers.get(bk)
        if (timer) {
          clearTimeout(timer)
          this.timers.delete(bk)
        }
      }
      for (const f of this.projectFiles(projectId)) {
        unlinkSync(join(this.dir, f))
      }
    } else {
      for (const [, timer] of this.timers) {
        clearTimeout(timer)
      }
      this.buffers.clear()
      this.timers.clear()
      this.dicts.clear()
      this.bufferMeta.clear()
      for (const f of this.jsonlFiles()) {
        unlinkSync(join(this.dir, f))
      }
    }
  }

  getProjects(): string[] {
    this.flush()
    const projects = new Set<string>()

    const seen = new Set<string>()
    for (const f of this.jsonlFiles()) {
      const parsed = this.parseFilename(f)
      if (!parsed) continue
      if (seen.has(parsed.projectSanitized)) continue
      seen.add(parsed.projectSanitized)

      const lines = readFileSync(join(this.dir, f), "utf-8").split("\n")
      for (const line of lines) {
        if (!line) continue
        const obj = JSON.parse(line)
        if (DICT_KEY in obj) continue
        projects.add((obj as StoredRender).projectId)
        break
      }
    }

    return [...projects]
  }

  getCommitIds(projectId?: string): number[] {
    this.flush(projectId)

    const files = projectId ? this.projectFiles(projectId) : this.jsonlFiles()
    const ids = new Set<number>()

    for (const f of files) {
      const parsed = this.parseFilename(f)
      if (parsed?.commitId != null) {
        ids.add(parsed.commitId)
      }
    }

    return [...ids].sort((a, b) => a - b)
  }

  getRendersByCommit(
    commitId: number,
    projectId?: string,
  ): RenderWithProject[] {
    if (projectId) {
      this.flush(projectId, commitId)
      const file = this.commitFile(projectId, commitId)
      return readJsonl(file).map(toResult)
    }

    // No projectId: find all files matching this commitId
    this.flush()
    const suffix = `_commit_${commitId}.jsonl`
    return this.jsonlFiles()
      .filter((f) => f.endsWith(suffix))
      .flatMap((f) => readJsonl(join(this.dir, f)).map(toResult))
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
      entry.count++
      if (Array.isArray(r.reason.propsDifferences)) entry.reasons.props++
      if (Array.isArray(r.reason.stateDifferences)) entry.reasons.state++
      if (Array.isArray(r.reason.hookDifferences)) entry.reasons.hooks++
    }

    return summary
  }

  getSummaryByCommit(
    projectId?: string,
  ): Record<string, Record<number, Record<string, ComponentSummary>>> {
    const renders = this.getAllRenders(projectId)
    const summary: Record<
      string,
      Record<number, Record<string, ComponentSummary>>
    > = {}

    for (const r of renders) {
      if (r.commitId == null) continue
      summary[r.project] ??= {}
      summary[r.project][r.commitId] ??= {}
      const commit = summary[r.project][r.commitId]
      commit[r.displayName] ??= {
        count: 0,
        reasons: { props: 0, state: 0, hooks: 0 },
      }
      const entry = commit[r.displayName]
      entry.count++
      if (Array.isArray(r.reason.propsDifferences)) entry.reasons.props++
      if (Array.isArray(r.reason.stateDifferences)) entry.reasons.state++
      if (Array.isArray(r.reason.hookDifferences)) entry.reasons.hooks++
    }

    return summary
  }

  private bufferKey(projectId: string, commitId?: number): string {
    return `${projectId}\0${commitId ?? NOCOMMIT}`
  }

  private bufferKeysForProject(projectId: string): string[] {
    const prefix = `${projectId}\0`
    return [...this.buffers.keys()].filter((bk) => bk.startsWith(prefix))
  }

  private commitFile(projectId: string, commitId?: number): string {
    const sanitized = sanitizeProjectId(projectId)
    const suffix = commitId != null ? `_commit_${commitId}` : `_${NOCOMMIT}`
    return join(this.dir, `${sanitized}${suffix}.jsonl`)
  }

  private projectFiles(projectId: string): string[] {
    const prefix = sanitizeProjectId(projectId)
    return readdirSync(this.dir).filter(
      (f) => f.startsWith(prefix) && f.endsWith(".jsonl"),
    )
  }

  private parseFilename(filename: string): ParsedFilename | null {
    if (!filename.endsWith(".jsonl")) return null
    const base = filename.slice(0, -".jsonl".length)

    const commitMatch = base.match(/^(.+)_commit_(\d+)$/)
    if (commitMatch) {
      return {
        projectSanitized: commitMatch[1],
        commitId: Number(commitMatch[2]),
      }
    }

    const nocommitMatch = base.match(/^(.+)_nocommit$/)
    if (nocommitMatch) {
      return { projectSanitized: nocommitMatch[1] }
    }

    // Legacy: plain {sanitizedProjectId}.jsonl — treat as nocommit
    return { projectSanitized: base }
  }

  private jsonlFiles(): string[] {
    return readdirSync(this.dir).filter((f) => f.endsWith(".jsonl"))
  }
}
