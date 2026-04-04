import { describe, expect, it } from "vitest"
import { sanitizeDifferences } from "./sanitize-differences.js"

describe("sanitizeDifferences", () => {
  it("returns false for non-array input", () => {
    expect(sanitizeDifferences(false)).toBe(false)
    expect(sanitizeDifferences(undefined)).toBe(false)
    expect(sanitizeDifferences(null)).toBe(false)
    expect(sanitizeDifferences("string")).toBe(false)
  })

  it("sanitizes difference objects", () => {
    const anon = () => {}
    const diffs = [
      {
        pathString: "onClick",
        diffType: "deepEquals",
        prevValue: function handler() {},
        nextValue: anon,
      },
    ]

    const result = sanitizeDifferences(diffs)
    expect(result).toEqual([
      {
        pathString: "onClick",
        diffType: "deepEquals",
        prevValue: { type: "function", name: "handler" },
        nextValue: { type: "function", name: "anon" },
      },
    ])
  })

  it("handles multiple differences", () => {
    const diffs = [
      {
        pathString: "count",
        diffType: "deepEquals",
        prevValue: 1,
        nextValue: 2,
      },
      {
        pathString: "items",
        diffType: "deepEquals",
        prevValue: [1, 2],
        nextValue: [1, 2, 3],
      },
    ]

    const result = sanitizeDifferences(diffs)
    expect(result).toHaveLength(2)
    expect(result).toEqual([
      {
        pathString: "count",
        diffType: "deepEquals",
        prevValue: 1,
        nextValue: 2,
      },
      {
        pathString: "items",
        diffType: "deepEquals",
        prevValue: [1, 2],
        nextValue: [1, 2, 3],
      },
    ])
  })

  it("returns empty array for empty diffs", () => {
    expect(sanitizeDifferences([])).toEqual([])
  })
})
