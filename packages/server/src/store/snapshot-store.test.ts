import { mkdirSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { SnapshotStore } from "./snapshot-store.js"
import type { ComponentSummary } from "./types.js"

describe("SnapshotStore", () => {
  const testDir = join(tmpdir(), "wdyr-test-snapshot-store")
  let snapshots: SnapshotStore

  const summaryData: Record<string, Record<string, ComponentSummary>> = {
    "http://localhost:3000": {
      App: { count: 5, reasons: { props: 3, state: 1, hooks: 1 } },
      Header: { count: 2, reasons: { props: 2, state: 0, hooks: 0 } },
    },
  }

  beforeEach(() => {
    rmSync(testDir, { recursive: true, force: true })
    mkdirSync(testDir, { recursive: true })
    snapshots = new SnapshotStore(testDir)
  })

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  it("saves and retrieves a snapshot", () => {
    snapshots.save("baseline", summaryData)

    const snapshot = snapshots.get("baseline")
    expect(snapshot).not.toBeNull()
    expect(snapshot?.name).toBe("baseline")
    expect(snapshot?.data).toEqual(summaryData)
    expect(snapshot?.timestamp).toBeTypeOf("number")
  })

  it("returns null for non-existent snapshot", () => {
    expect(snapshots.get("nonexistent")).toBeNull()
  })

  it("lists saved snapshots", () => {
    snapshots.save("before", summaryData)
    snapshots.save("after", summaryData)

    const list = snapshots.list()
    expect(list).toHaveLength(2)
    expect(list.map((s) => s.name).sort()).toEqual(["after", "before"])
    expect(list[0].timestamp).toBeTypeOf("number")
  })

  it("returns empty list when no snapshots exist", () => {
    expect(snapshots.list()).toEqual([])
  })

  it("deletes a snapshot", () => {
    snapshots.save("temp", summaryData)
    expect(snapshots.delete("temp")).toBe(true)
    expect(snapshots.get("temp")).toBeNull()
  })

  it("returns false when deleting non-existent snapshot", () => {
    expect(snapshots.delete("nonexistent")).toBe(false)
  })

  it("overwrites existing snapshot with same name", () => {
    snapshots.save("baseline", summaryData)

    const updatedData: Record<string, Record<string, ComponentSummary>> = {
      "http://localhost:3000": {
        App: { count: 10, reasons: { props: 8, state: 1, hooks: 1 } },
      },
    }
    snapshots.save("baseline", updatedData)

    const snapshot = snapshots.get("baseline")
    expect(snapshot?.data).toEqual(updatedData)
  })
})
