import { describe, expect, it } from "vitest"
import type { StoredRender } from "../types.js"
import { toResult } from "./to-result.js"

describe("toResult", () => {
  const baseReason = {
    propsDifferences: false as const,
    stateDifferences: false as const,
    hookDifferences: false as const,
  }

  it("maps StoredRender to RenderWithProject", () => {
    const stored: StoredRender = {
      projectId: "http://localhost:3000",
      displayName: "App",
      reason: baseReason,
    }

    expect(toResult(stored)).toEqual({
      project: "http://localhost:3000",
      displayName: "App",
      reason: baseReason,
    })
  })

  it("includes hookName when present", () => {
    const stored: StoredRender = {
      projectId: "http://localhost:3000",
      displayName: "Counter",
      reason: baseReason,
      hookName: "useState",
    }

    const result = toResult(stored)
    expect(result.hookName).toBe("useState")
  })

  it("omits hookName when null", () => {
    const stored: StoredRender = {
      projectId: "http://localhost:3000",
      displayName: "App",
      reason: baseReason,
      hookName: undefined,
    }

    expect(toResult(stored)).not.toHaveProperty("hookName")
  })
})
