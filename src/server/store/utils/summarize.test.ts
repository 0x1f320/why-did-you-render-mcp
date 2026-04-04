import { describe, expect, it } from "vitest"
import type { RenderWithProject } from "../types.js"
import { summarize, summarizeByCommit } from "./summarize.js"

function makeRender(
  displayName: string,
  project: string,
  overrides?: Partial<RenderWithProject>,
): RenderWithProject {
  return {
    displayName,
    project,
    reason: {
      propsDifferences: [
        {
          pathString: "count",
          diffType: "deepEquals",
          prevValue: "1",
          nextValue: "2",
        },
      ],
      stateDifferences: false,
      hookDifferences: false,
    },
    ...overrides,
  }
}

describe("summarize", () => {
  it("groups by project and component", () => {
    const renders = [
      makeRender("App", "http://localhost:3000"),
      makeRender("App", "http://localhost:3000"),
      makeRender("Header", "http://localhost:3000"),
      makeRender("Dashboard", "http://localhost:5173"),
    ]

    const summary = summarize(renders)
    expect(summary["http://localhost:3000"]).toEqual({
      App: { count: 2, reasons: { props: 2, state: 0, hooks: 0 } },
      Header: { count: 1, reasons: { props: 1, state: 0, hooks: 0 } },
    })
    expect(summary["http://localhost:5173"]).toEqual({
      Dashboard: { count: 1, reasons: { props: 1, state: 0, hooks: 0 } },
    })
  })

  it("returns empty object for empty input", () => {
    expect(summarize([])).toEqual({})
  })

  it("tracks reason breakdown with mixed reason types", () => {
    const renders: RenderWithProject[] = [
      makeRender("App", "http://localhost:3000", {
        reason: {
          propsDifferences: false,
          stateDifferences: [
            {
              pathString: "value",
              diffType: "deepEquals",
              prevValue: "1",
              nextValue: "2",
            },
          ],
          hookDifferences: false,
        },
      }),
      makeRender("App", "http://localhost:3000", {
        reason: {
          propsDifferences: false,
          stateDifferences: false,
          hookDifferences: [
            {
              pathString: "",
              diffType: "deepEquals",
              prevValue: "1",
              nextValue: "2",
            },
          ],
        },
      }),
      makeRender("App", "http://localhost:3000", {
        reason: {
          propsDifferences: [
            {
              pathString: "a",
              diffType: "deepEquals",
              prevValue: "1",
              nextValue: "2",
            },
          ],
          stateDifferences: [
            {
              pathString: "b",
              diffType: "deepEquals",
              prevValue: "3",
              nextValue: "4",
            },
          ],
          hookDifferences: false,
        },
      }),
    ]

    const summary = summarize(renders)
    expect(summary["http://localhost:3000"]).toEqual({
      App: { count: 3, reasons: { props: 1, state: 2, hooks: 1 } },
    })
  })

  it("accumulates totalDuration when present", () => {
    const renders = [
      makeRender("App", "http://localhost:3000", { actualDuration: 5.5 }),
      makeRender("App", "http://localhost:3000", { actualDuration: 3.2 }),
    ]

    const summary = summarize(renders)
    expect(summary["http://localhost:3000"].App.totalDuration).toBeCloseTo(8.7)
  })

  it("omits totalDuration when no render has it", () => {
    const renders = [makeRender("App", "http://localhost:3000")]

    const summary = summarize(renders)
    expect(summary["http://localhost:3000"].App.totalDuration).toBeUndefined()
  })
})

describe("summarizeByCommit", () => {
  it("groups by project, commit, and component", () => {
    const renders = [
      makeRender("App", "http://localhost:3000", { commitId: 1 }),
      makeRender("App", "http://localhost:3000", { commitId: 1 }),
      makeRender("Header", "http://localhost:3000", { commitId: 2 }),
    ]

    const summary = summarizeByCommit(renders)
    expect(summary["http://localhost:3000"][1]).toEqual({
      App: { count: 2, reasons: { props: 2, state: 0, hooks: 0 } },
    })
    expect(summary["http://localhost:3000"][2]).toEqual({
      Header: { count: 1, reasons: { props: 1, state: 0, hooks: 0 } },
    })
  })

  it("returns empty object for empty input", () => {
    expect(summarizeByCommit([])).toEqual({})
  })

  it("skips renders without commitId", () => {
    const renders = [
      makeRender("App", "http://localhost:3000"),
      makeRender("Header", "http://localhost:3000", { commitId: 1 }),
    ]

    const summary = summarizeByCommit(renders)
    expect(summary["http://localhost:3000"]).toEqual({
      1: { Header: { count: 1, reasons: { props: 1, state: 0, hooks: 0 } } },
    })
  })

  it("accumulates totalDuration per commit", () => {
    const renders = [
      makeRender("App", "http://localhost:3000", {
        commitId: 1,
        actualDuration: 2.0,
      }),
      makeRender("App", "http://localhost:3000", {
        commitId: 1,
        actualDuration: 3.5,
      }),
    ]

    const summary = summarizeByCommit(renders)
    expect(summary["http://localhost:3000"][1].App.totalDuration).toBeCloseTo(
      5.5,
    )
  })
})
