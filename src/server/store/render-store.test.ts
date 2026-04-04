import { mkdirSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { RenderReport } from "../../types.js"
import { RenderStore } from "./render-store.js"

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
})
