import { describe, expect, it } from "vitest"
import { sanitizeReason } from "./sanitize-reason.js"

describe("sanitizeReason", () => {
  it("sanitizes all three difference categories", () => {
    const reason = {
      propsDifferences: [
        {
          pathString: "onClick",
          diffType: "function",
          prevValue: function old() {},
          nextValue: function next() {},
        },
      ],
      stateDifferences: false,
      hookDifferences: [
        {
          pathString: "",
          diffType: "deepEquals",
          prevValue: { a: 1 },
          nextValue: { a: 2 },
        },
      ],
    } as never

    const result = sanitizeReason(reason)

    expect(result.propsDifferences).toEqual([
      {
        pathString: "onClick",
        diffType: "function",
        prevValue: { type: "function", name: "old" },
        nextValue: { type: "function", name: "next" },
      },
    ])
    expect(result.stateDifferences).toBe(false)
    expect(result.hookDifferences).toEqual([
      {
        pathString: "",
        diffType: "deepEquals",
        prevValue: { a: 1 },
        nextValue: { a: 2 },
      },
    ])
  })

  it("returns false for all categories when none have differences", () => {
    const reason = {
      propsDifferences: false,
      stateDifferences: false,
      hookDifferences: false,
    } as never

    const result = sanitizeReason(reason)
    expect(result.propsDifferences).toBe(false)
    expect(result.stateDifferences).toBe(false)
    expect(result.hookDifferences).toBe(false)
  })
})
