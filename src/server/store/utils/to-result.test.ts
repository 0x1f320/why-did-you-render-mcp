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
      timestamp: 1000,
      commitId: 1,
    }

    expect(toResult(stored)).toEqual({
      project: "http://localhost:3000",
      displayName: "App",
      reason: baseReason,
      timestamp: 1000,
      commitId: 1,
    })
  })

  it("includes hookName when present", () => {
    const stored: StoredRender = {
      projectId: "http://localhost:3000",
      displayName: "Counter",
      reason: baseReason,
      hookName: "useState",
      timestamp: 1000,
      commitId: 1,
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
      timestamp: 1000,
      commitId: 1,
    }

    expect(toResult(stored)).not.toHaveProperty("hookName")
  })

  it("defaults timestamp and commitId to 0 for legacy data", () => {
    const stored = {
      projectId: "http://localhost:3000",
      displayName: "App",
      reason: baseReason,
    } as StoredRender

    const result = toResult(stored)
    expect(result.timestamp).toBe(0)
    expect(result.commitId).toBe(0)
  })
})
