import { describe, expect, it } from "vitest"
import { describeValue } from "./describe-value.js"

describe("describeValue", () => {
  it("describes null", () => {
    expect(describeValue(null)).toBe("null")
  })

  it("describes undefined", () => {
    expect(describeValue(undefined)).toBe("undefined")
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

  it("describes primitives", () => {
    expect(describeValue(42)).toBe("42")
    expect(describeValue("hello")).toBe("hello")
    expect(describeValue(true)).toBe("true")
  })

  it("serializes arrays with contents", () => {
    expect(describeValue([1, 2, 3])).toBe("[1,2,3]")
    expect(describeValue([])).toBe("[]")
  })

  it("serializes plain objects with properties", () => {
    expect(describeValue({ a: 1, b: "two" })).toBe('{"a":1,"b":"two"}')
  })

  it("serializes nested objects", () => {
    expect(describeValue({ user: { name: "Alice", age: 30 } })).toBe(
      '{"user":{"name":"Alice","age":30}}',
    )
  })

  it("replaces functions inside objects", () => {
    function handler() {}
    expect(describeValue({ onClick: handler })).toBe(
      '{"onClick":"[Function: handler]"}',
    )
  })

  it("handles circular references", () => {
    const obj: Record<string, unknown> = { a: 1 }
    obj.self = obj
    expect(describeValue(obj)).toBe('{"a":1,"self":"[Circular]"}')
  })

  it("respects depth limit", () => {
    const deep = { l1: { l2: { l3: { l4: { l5: "too deep" } } } } }
    const result = describeValue(deep)
    expect(result).toContain("[Object]")
  })

  it("describes class instances", () => {
    class MyComponent {}
    expect(describeValue(new MyComponent())).toBe('"[MyComponent]"')
  })

  it("describes Date as ISO string", () => {
    const d = new Date("2024-01-01T00:00:00.000Z")
    expect(describeValue(d)).toBe('"2024-01-01T00:00:00.000Z"')
  })

  it("describes Map", () => {
    const m = new Map([
      ["a", 1],
      ["b", 2],
    ])
    expect(describeValue(m)).toBe('"Map(2){a => 1, b => 2}"')
  })

  it("describes Set", () => {
    const s = new Set([1, 2, 3])
    expect(describeValue(s)).toBe('"Set(3){1, 2, 3}"')
  })

  it("describes RegExp", () => {
    expect(describeValue(/foo/gi)).toBe('"/foo/gi"')
  })

  it("truncates values exceeding max length", () => {
    const large = Object.fromEntries(
      Array.from({ length: 100 }, (_, i) => [
        `key${i}`,
        `value-${i}-${"x".repeat(20)}`,
      ]),
    )
    const result = describeValue(large)
    expect(result.length).toBeLessThanOrEqual(1025) // 1024 + "…"
    expect(result).toMatch(/…$/)
  })
})
