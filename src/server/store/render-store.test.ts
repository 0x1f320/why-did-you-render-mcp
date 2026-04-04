import { mkdirSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { RenderReport, SafeReasonForUpdate } from "../../types.js"
import { RenderStore } from "./render-store.js"

describe("RenderStore", () => {
  const testDir = join(tmpdir(), "wdyr-test-render-store")
  let store: RenderStore

  const propsReason = {
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

  const stateReason = {
    propsDifferences: false as const,
    stateDifferences: [
      {
        pathString: "value",
        diffType: "deepEquals",
        prevValue: "1",
        nextValue: "2",
      },
    ],
    hookDifferences: false as const,
  }

  const hooksReason = {
    propsDifferences: false as const,
    stateDifferences: false as const,
    hookDifferences: [
      {
        pathString: "",
        diffType: "deepEquals",
        prevValue: "1",
        nextValue: "2",
      },
    ],
  }

  const mixedReason = {
    propsDifferences: [
      {
        pathString: "count",
        diffType: "deepEquals",
        prevValue: "1",
        nextValue: "2",
      },
    ],
    stateDifferences: [
      {
        pathString: "value",
        diffType: "deepEquals",
        prevValue: "1",
        nextValue: "2",
      },
    ],
    hookDifferences: false as const,
  }

  function makeReport(
    name: string,
    hookName?: string,
    reason: SafeReasonForUpdate = propsReason,
  ): RenderReport {
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
      App: {
        count: 2,
        reasons: { props: 2, state: 0, hooks: 0 },
      },
      Header: {
        count: 1,
        reasons: { props: 1, state: 0, hooks: 0 },
      },
    })
    expect(summary["http://localhost:5173"]).toEqual({
      Dashboard: {
        count: 1,
        reasons: { props: 1, state: 0, hooks: 0 },
      },
    })
  })

  it("produces a summary for a single project", () => {
    store.addRender(makeReport("App"), "http://localhost:3000")
    store.addRender(makeReport("Dashboard"), "http://localhost:5173")

    const summary = store.getSummary("http://localhost:3000")
    expect(Object.keys(summary)).toEqual(["http://localhost:3000"])
  })

  it("tracks state-only reason in summary", () => {
    store.addRender(
      makeReport("Counter", undefined, stateReason),
      "http://localhost:3000",
    )

    const summary = store.getSummary()
    expect(summary["http://localhost:3000"]).toEqual({
      Counter: {
        count: 1,
        reasons: { props: 0, state: 1, hooks: 0 },
      },
    })
  })

  it("tracks hooks-only reason in summary", () => {
    store.addRender(
      makeReport("List", undefined, hooksReason),
      "http://localhost:3000",
    )

    const summary = store.getSummary()
    expect(summary["http://localhost:3000"]).toEqual({
      List: {
        count: 1,
        reasons: { props: 0, state: 0, hooks: 1 },
      },
    })
  })

  it("tracks mixed reasons in summary", () => {
    store.addRender(
      makeReport("App", undefined, mixedReason),
      "http://localhost:3000",
    )
    store.addRender(
      makeReport("App", undefined, propsReason),
      "http://localhost:3000",
    )
    store.addRender(
      makeReport("App", undefined, hooksReason),
      "http://localhost:3000",
    )

    const summary = store.getSummary()
    expect(summary["http://localhost:3000"]).toEqual({
      App: {
        count: 3,
        reasons: { props: 2, state: 1, hooks: 1 },
      },
    })
  })
})
