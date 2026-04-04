import { mkdirSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { RenderStore } from "../../store/render-store.js"

// We need to mock the store singleton used by resolveProject
vi.mock("../../store/index.js", () => {
  const testDir = join(tmpdir(), "wdyr-test-resolve-project")
  mkdirSync(testDir, { recursive: true })
  return { store: new RenderStore(testDir) }
})

// Import after mock is set up
const { resolveProject } = await import("./resolve-project.js")
const { store } = await import("../../store/index.js")

const reason = {
  propsDifferences: false as const,
  stateDifferences: false as const,
  hookDifferences: false as const,
}

describe("resolveProject", () => {
  const testDir = join(tmpdir(), "wdyr-test-resolve-project")

  beforeEach(() => {
    store.clearRenders()
  })

  afterEach(() => {
    store.clearRenders()
  })

  it("returns the given project when explicitly provided", () => {
    const result = resolveProject("http://localhost:3000")
    expect(result).toEqual({ projectId: "http://localhost:3000" })
  })

  it("returns undefined projectId when no projects exist", () => {
    const result = resolveProject(undefined)
    expect(result).toEqual({ projectId: undefined })
  })

  it("auto-selects the single project", () => {
    store.addRender({ displayName: "App", reason }, "http://localhost:3000")

    const result = resolveProject(undefined)
    expect(result).toEqual({ projectId: "http://localhost:3000" })
  })

  it("returns error when multiple projects exist and none specified", () => {
    store.addRender({ displayName: "App", reason }, "http://localhost:3000")
    store.addRender(
      { displayName: "Dashboard", reason },
      "http://localhost:5173",
    )

    const result = resolveProject(undefined)
    expect(result.error).toBeDefined()
    expect(result.error).toContain("Multiple projects")
    expect(result.error).toContain("http://localhost:3000")
    expect(result.error).toContain("http://localhost:5173")
  })
})
