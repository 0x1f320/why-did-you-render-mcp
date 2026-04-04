import { describe, expect, it } from "vitest"
import { describeValue } from "./describe-value.js"

describe("describeValue", () => {
  it("returns null for null", () => {
    expect(describeValue(null)).toBe(null)
  })

  it("returns null for undefined", () => {
    expect(describeValue(undefined)).toBe(null)
  })

  it("returns function object for named functions", () => {
    function myFunc() {}
    expect(describeValue(myFunc)).toEqual({ type: "function", name: "myFunc" })
  })

  it("returns function object for anonymous functions", () => {
    expect(describeValue(() => {})).toEqual({
      type: "function",
      name: "anonymous",
    })
  })

  it("preserves numbers", () => {
    expect(describeValue(42)).toBe(42)
    expect(describeValue(0)).toBe(0)
    expect(describeValue(-3.14)).toBe(-3.14)
  })

  it("preserves booleans", () => {
    expect(describeValue(true)).toBe(true)
    expect(describeValue(false)).toBe(false)
  })

  it("preserves strings", () => {
    expect(describeValue("hello")).toBe("hello")
  })

  it("preserves arrays as actual arrays", () => {
    expect(describeValue([1, 2, 3])).toEqual([1, 2, 3])
    expect(describeValue([])).toEqual([])
  })

  it("preserves objects as actual objects", () => {
    expect(describeValue({ a: 1, b: "two" })).toEqual({ a: 1, b: "two" })
  })

  it("preserves nested structures", () => {
    const input = { user: { name: "Alice", tags: [1, 2] } }
    expect(describeValue(input)).toEqual({
      user: { name: "Alice", tags: [1, 2] },
    })
  })

  it("replaces functions inside objects", () => {
    function handler() {}
    expect(describeValue({ onClick: handler })).toEqual({
      onClick: { type: "function", name: "handler" },
    })
  })

  it("handles circular references", () => {
    const obj: Record<string, unknown> = { a: 1 }
    obj.self = obj
    expect(describeValue(obj)).toEqual({ a: 1, self: "[Circular]" })
  })

  it("respects depth limit", () => {
    let deep: unknown = "leaf"
    for (let i = 0; i < 10; i++) deep = { nested: deep }
    const result = JSON.stringify(describeValue(deep))
    expect(result).toContain("[MaxDepth]")
  })

  it("returns class object for unknown instances", () => {
    class MyComponent {}
    expect(describeValue(new MyComponent())).toEqual({
      type: "class",
      name: "MyComponent",
    })
  })

  it("returns 'Promise' for promises", () => {
    expect(describeValue(Promise.resolve())).toBe("Promise")
  })

  it("returns structured Error", () => {
    expect(describeValue(new TypeError("oops"))).toEqual({
      type: "Error",
      name: "TypeError",
      message: "oops",
    })
  })

  it("converts Date to ISO string", () => {
    const d = new Date("2024-01-01T00:00:00.000Z")
    expect(describeValue(d)).toBe("2024-01-01T00:00:00.000Z")
  })

  it("converts Map to structured object", () => {
    const m = new Map<string, number>([
      ["a", 1],
      ["b", 2],
    ])
    expect(describeValue(m)).toEqual({
      type: "Map",
      entries: { a: 1, b: 2 },
    })
  })

  it("converts Set to structured object", () => {
    const s = new Set([1, 2, 3])
    expect(describeValue(s)).toEqual({
      type: "Set",
      values: [1, 2, 3],
    })
  })

  it("converts RegExp to string", () => {
    expect(describeValue(/foo/gi)).toBe("/foo/gi")
  })

  it("converts undefined values inside objects to null", () => {
    expect(describeValue({ a: undefined, b: 1 })).toEqual({ a: null, b: 1 })
  })

  it("converts NaN to string", () => {
    expect(describeValue(Number.NaN)).toBe("NaN")
  })

  it("converts Infinity to string", () => {
    expect(describeValue(Number.POSITIVE_INFINITY)).toBe("Infinity")
    expect(describeValue(Number.NEGATIVE_INFINITY)).toBe("-Infinity")
  })

  it("converts -0 to string", () => {
    expect(describeValue(-0)).toBe("-0")
  })

  it("converts bigint to string", () => {
    expect(describeValue(123n)).toBe("123")
  })

  it("converts symbol to string", () => {
    expect(describeValue(Symbol("id"))).toBe("Symbol(id)")
  })

  it("handles mixed special values inside arrays", () => {
    function fn() {}
    expect(describeValue([1, undefined, fn, Number.NaN, null])).toEqual([
      1,
      null,
      { type: "function", name: "fn" },
      "NaN",
      null,
    ])
  })

  it("handles special values inside objects", () => {
    expect(
      describeValue({ a: Number.POSITIVE_INFINITY, b: undefined, c: -0 }),
    ).toEqual({ a: "Infinity", b: null, c: "-0" })
  })

  it("handles nested arrays", () => {
    expect(describeValue([[1, 2], [3]])).toEqual([[1, 2], [3]])
  })

  it("handles non-serializable values inside Map", () => {
    const m = new Map<string, unknown>([
      ["fn", () => {}],
      ["val", 42],
    ])
    const result = describeValue(m) as Record<string, unknown>
    expect(result).toEqual({
      type: "Map",
      entries: {
        fn: { type: "function", name: "anonymous" },
        val: 42,
      },
    })
  })

  it("handles non-serializable values inside Set", () => {
    function foo() {}
    const s = new Set([1, foo, undefined])
    expect(describeValue(s)).toEqual({
      type: "Set",
      values: [1, { type: "function", name: "foo" }, null],
    })
  })

  it("handles empty string and empty object", () => {
    expect(describeValue("")).toBe("")
    expect(describeValue({})).toEqual({})
  })
})
