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
import type { ComponentSummary, Snapshot, SnapshotMeta } from "./types.js"

export class SnapshotStore {
  private readonly dir: string

  constructor(dir?: string) {
    this.dir = dir ?? join(homedir(), ".wdyr-mcp", "snapshots")
  }

  save(
    name: string,
    data: Record<string, Record<string, ComponentSummary>>,
  ): void {
    mkdirSync(this.dir, { recursive: true })
    const snapshot: Snapshot = { name, timestamp: Date.now(), data }
    writeFileSync(
      join(this.dir, `${name}.json`),
      JSON.stringify(snapshot, null, 2),
    )
  }

  list(): SnapshotMeta[] {
    if (!existsSync(this.dir)) return []
    return readdirSync(this.dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        const content = readFileSync(join(this.dir, f), "utf-8")
        const snapshot = JSON.parse(content) as Snapshot
        return { name: snapshot.name, timestamp: snapshot.timestamp }
      })
  }

  get(name: string): Snapshot | null {
    const file = join(this.dir, `${name}.json`)
    if (!existsSync(file)) return null
    return JSON.parse(readFileSync(file, "utf-8")) as Snapshot
  }

  delete(name: string): boolean {
    const file = join(this.dir, `${name}.json`)
    if (!existsSync(file)) return false
    unlinkSync(file)
    return true
  }
}
