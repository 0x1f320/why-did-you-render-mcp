import { mkdirSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { RenderReport, SafeReasonForUpdate } from "../../types.js"
import { RenderStore } from "./render-store.js"
import { DICT_KEY } from "./utils/value-dict.js"

describe("RenderStore", () => {
  const testDir = join(tmpdir(), "wdyr-test-render-store")
  let store: RenderStore

  const reason = {
    propsDifferences: [
      {
        pathString: "count",
        diffType: "deepEquals",
        prevValue: "1",
        nextValue: "2",
      },
    ],
    stateDifferences: false as const,
    hookDifferences: false as const,
  }

  function makeReport(name: string, hookName?: string): RenderReport {
    return { displayName: name, reason, ...(hookName && { hookName }) }
  }

  beforeEach(() => {
    rmSync(testDir, { recursive: true, force: true })
    mkdirSync(testDir, { recursive: true })
    store = new RenderStore(testDir)
  })

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  it("stores and retrieves renders", () => {
    store.addRender(makeReport("App"), "http://localhost:3000")
    store.addRender(makeReport("Header"), "http://localhost:3000")

    const renders = store.getAllRenders("http://localhost:3000")
    expect(renders).toHaveLength(2)
    expect(renders[0].displayName).toBe("App")
    expect(renders[0].project).toBe("http://localhost:3000")
  })

  it("returns empty array when no renders exist", () => {
    expect(store.getAllRenders("http://localhost:3000")).toEqual([])
  })

  it("filters by component name", () => {
    store.addRender(makeReport("App"), "http://localhost:3000")
    store.addRender(makeReport("Header"), "http://localhost:3000")
    store.addRender(makeReport("App"), "http://localhost:3000")

    const renders = store.getRendersByComponent("App", "http://localhost:3000")
    expect(renders).toHaveLength(2)
    expect(renders.every((r) => r.displayName === "App")).toBe(true)
  })

  it("supports multiple projects", () => {
    store.addRender(makeReport("App"), "http://localhost:3000")
    store.addRender(makeReport("Dashboard"), "http://localhost:5173")

    const all = store.getAllRenders()
    expect(all).toHaveLength(2)

    const proj1 = store.getAllRenders("http://localhost:3000")
    expect(proj1).toHaveLength(1)
    expect(proj1[0].displayName).toBe("App")
  })

  it("clears renders for a specific project", () => {
    store.addRender(makeReport("App"), "http://localhost:3000")
    store.addRender(makeReport("Dashboard"), "http://localhost:5173")

    store.clearRenders("http://localhost:3000")

    expect(store.getAllRenders("http://localhost:3000")).toEqual([])
    expect(store.getAllRenders("http://localhost:5173")).toHaveLength(1)
  })

  it("clears all renders", () => {
    store.addRender(makeReport("App"), "http://localhost:3000")
    store.addRender(makeReport("Dashboard"), "http://localhost:5173")

    store.clearRenders()

    expect(store.getAllRenders()).toEqual([])
  })

  it("lists projects", () => {
    store.addRender(makeReport("App"), "http://localhost:3000")
    store.addRender(makeReport("Dashboard"), "http://localhost:5173")

    const projects = store.getProjects()
    expect(projects).toContain("http://localhost:3000")
    expect(projects).toContain("http://localhost:5173")
    expect(projects).toHaveLength(2)
  })

  it("returns empty projects list when no data", () => {
    expect(store.getProjects()).toEqual([])
  })

  it("produces a summary grouped by project and component", () => {
    store.addRender(makeReport("App"), "http://localhost:3000")
    store.addRender(makeReport("App"), "http://localhost:3000")
    store.addRender(makeReport("Header"), "http://localhost:3000")
    store.addRender(makeReport("Dashboard"), "http://localhost:5173")

    const summary = store.getSummary()
    expect(summary["http://localhost:3000"]).toEqual({
      App: 2,
      Header: 1,
    })
    expect(summary["http://localhost:5173"]).toEqual({
      Dashboard: 1,
    })
  })

  it("produces a summary for a single project", () => {
    store.addRender(makeReport("App"), "http://localhost:3000")
    store.addRender(makeReport("Dashboard"), "http://localhost:5173")

    const summary = store.getSummary("http://localhost:3000")
    expect(Object.keys(summary)).toEqual(["http://localhost:3000"])
  })

  it("stores and retrieves commitId", () => {
    store.addRender(makeReport("App"), "http://localhost:3000", 1)
    store.addRender(makeReport("Header"), "http://localhost:3000", 1)
    store.addRender(makeReport("App"), "http://localhost:3000", 2)

    const renders = store.getAllRenders("http://localhost:3000")
    expect(renders[0].commitId).toBe(1)
    expect(renders[1].commitId).toBe(1)
    expect(renders[2].commitId).toBe(2)
  })

  it("returns unique commit IDs", () => {
    store.addRender(makeReport("App"), "http://localhost:3000", 1)
    store.addRender(makeReport("Header"), "http://localhost:3000", 1)
    store.addRender(makeReport("App"), "http://localhost:3000", 2)
    store.addRender(makeReport("Footer"), "http://localhost:3000", 3)

    const commitIds = store.getCommitIds("http://localhost:3000")
    expect(commitIds).toEqual([1, 2, 3])
  })

  it("returns empty commit IDs when no renders exist", () => {
    expect(store.getCommitIds("http://localhost:3000")).toEqual([])
  })

  it("excludes renders without commitId from getCommitIds", () => {
    store.addRender(makeReport("App"), "http://localhost:3000")
    store.addRender(makeReport("Header"), "http://localhost:3000", 1)

    const commitIds = store.getCommitIds("http://localhost:3000")
    expect(commitIds).toEqual([1])
  })

  it("filters renders by commit ID", () => {
    store.addRender(makeReport("App"), "http://localhost:3000", 1)
    store.addRender(makeReport("Header"), "http://localhost:3000", 1)
    store.addRender(makeReport("Footer"), "http://localhost:3000", 2)

    const renders = store.getRendersByCommit(1, "http://localhost:3000")
    expect(renders).toHaveLength(2)
    expect(renders[0].displayName).toBe("App")
    expect(renders[1].displayName).toBe("Header")
  })

  it("returns empty array for non-existent commit ID", () => {
    store.addRender(makeReport("App"), "http://localhost:3000", 1)

    expect(store.getRendersByCommit(99, "http://localhost:3000")).toEqual([])
  })

  it("filters renders by commit ID across projects", () => {
    store.addRender(makeReport("App"), "http://localhost:3000", 1)
    store.addRender(makeReport("Dashboard"), "http://localhost:5173", 1)

    const renders = store.getRendersByCommit(1)
    expect(renders).toHaveLength(2)
  })

  describe("value dictionary deduplication", () => {
    const objectReason: SafeReasonForUpdate = {
      propsDifferences: [
        {
          pathString: "user",
          diffType: "deepEquals",
          prevValue: { name: "Alice", age: 30 },
          nextValue: { name: "Alice", age: 31 },
        },
      ],
      stateDifferences: false,
      hookDifferences: false,
    }

    function makeObjectReport(name: string): RenderReport {
      return { displayName: name, reason: objectReason }
    }

    it("dehydrates object values into dictionary refs on disk", () => {
      store.addRender(makeObjectReport("App"), "http://localhost:3000")
      store.flush()

      const file = join(testDir, "http___localhost_3000_nocommit.jsonl")
      const lines = readFileSync(file, "utf-8").split("\n").filter(Boolean)

      const dictLine = JSON.parse(lines[0])
      expect(dictLine).toHaveProperty(DICT_KEY)

      const dict = dictLine[DICT_KEY]
      expect(Object.keys(dict)).toHaveLength(2)
      expect(Object.values(dict)).toContainEqual({ name: "Alice", age: 30 })
      expect(Object.values(dict)).toContainEqual({ name: "Alice", age: 31 })

      const renderLine = JSON.parse(lines[1])
      const diff = renderLine.reason.propsDifferences[0]
      expect(diff.prevValue).toMatch(/^@@ref:/)
      expect(diff.nextValue).toMatch(/^@@ref:/)
    })

    it("hydrates refs back to original values on read", () => {
      store.addRender(makeObjectReport("App"), "http://localhost:3000")

      const renders = store.getAllRenders("http://localhost:3000")
      expect(renders).toHaveLength(1)

      const diff = renders[0].reason.propsDifferences
      expect(diff).not.toBe(false)
      if (!diff) return
      expect(diff[0].prevValue).toEqual({ name: "Alice", age: 30 })
      expect(diff[0].nextValue).toEqual({ name: "Alice", age: 31 })
    })

    it("deduplicates identical values across renders", () => {
      store.addRender(makeObjectReport("App"), "http://localhost:3000")
      store.addRender(makeObjectReport("Header"), "http://localhost:3000")
      store.flush()

      const file = join(testDir, "http___localhost_3000_nocommit.jsonl")
      const lines = readFileSync(file, "utf-8").split("\n").filter(Boolean)

      // 1 dict line + 2 render lines
      expect(lines).toHaveLength(3)

      const dict = JSON.parse(lines[0])[DICT_KEY]
      // same 2 unique values, not 4
      expect(Object.keys(dict)).toHaveLength(2)
    })

    it("leaves primitive values inline", () => {
      store.addRender(makeReport("App"), "http://localhost:3000")
      store.flush()

      const file = join(testDir, "http___localhost_3000_nocommit.jsonl")
      const raw = readFileSync(file, "utf-8")
      // no dict line needed for primitive-only values
      expect(raw).not.toContain(DICT_KEY)
    })

    it("accumulates dictionary across multiple flushes", () => {
      const reason1: SafeReasonForUpdate = {
        propsDifferences: [
          {
            pathString: "a",
            diffType: "deepEquals",
            prevValue: { x: 1 },
            nextValue: { x: 2 },
          },
        ],
        stateDifferences: false,
        hookDifferences: false,
      }
      const reason2: SafeReasonForUpdate = {
        propsDifferences: [
          {
            pathString: "b",
            diffType: "deepEquals",
            prevValue: { y: 1 },
            nextValue: { y: 2 },
          },
        ],
        stateDifferences: false,
        hookDifferences: false,
      }

      store.addRender(
        { displayName: "App", reason: reason1 },
        "http://localhost:3000",
      )
      store.flush()

      store.addRender(
        { displayName: "App", reason: reason2 },
        "http://localhost:3000",
      )
      store.flush()

      // Should read all 2 renders correctly
      const renders = store.getAllRenders("http://localhost:3000")
      expect(renders).toHaveLength(2)
      const diffs0 = renders[0].reason.propsDifferences
      const diffs1 = renders[1].reason.propsDifferences
      expect(diffs0).not.toBe(false)
      expect(diffs1).not.toBe(false)
      if (!diffs0 || !diffs1) return
      expect(diffs0[0].prevValue).toEqual({ x: 1 })
      expect(diffs1[0].prevValue).toEqual({ y: 1 })
    })
  })
})
