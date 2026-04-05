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

  it("converts React element to react-node", () => {
    function MyComponent() {}
    const el = {
      $$typeof: Symbol.for("react.element"),
      type: MyComponent,
      props: { className: "foo", onClick: () => {} },
      key: null,
      ref: null,
    }
    expect(describeValue(el)).toEqual({
      type: "react-node",
      component: { name: "MyComponent", memo: false, forwardRef: false },
      props: {
        className: "foo",
        onClick: { type: "function", name: "onClick" },
      },
    })
  })

  it("detects memo-wrapped React element", () => {
    function Inner() {}
    const el = {
      $$typeof: Symbol.for("react.element"),
      type: {
        $$typeof: Symbol.for("react.memo"),
        type: Inner,
      },
      props: { count: 3 },
      key: null,
      ref: null,
    }
    expect(describeValue(el)).toEqual({
      type: "react-node",
      component: { name: "Inner", memo: true, forwardRef: false },
      props: { count: 3 },
    })
  })

  it("detects forwardRef-wrapped React element", () => {
    function Button() {}
    const el = {
      $$typeof: Symbol.for("react.element"),
      type: {
        $$typeof: Symbol.for("react.forward_ref"),
        render: Button,
      },
      props: { disabled: true },
      key: null,
      ref: null,
    }
    expect(describeValue(el)).toEqual({
      type: "react-node",
      component: { name: "Button", memo: false, forwardRef: true },
      props: { disabled: true },
    })
  })

  it("detects memo(forwardRef(...)) wrapped React element", () => {
    function Input() {}
    const el = {
      $$typeof: Symbol.for("react.element"),
      type: {
        $$typeof: Symbol.for("react.memo"),
        type: {
          $$typeof: Symbol.for("react.forward_ref"),
          render: Input,
        },
      },
      props: { value: "hi" },
      key: null,
      ref: null,
    }
    expect(describeValue(el)).toEqual({
      type: "react-node",
      component: { name: "Input", memo: true, forwardRef: true },
      props: { value: "hi" },
    })
  })

  it("uses displayName for React element component", () => {
    function Foo() {}
    Foo.displayName = "CustomName"
    const el = {
      $$typeof: Symbol.for("react.element"),
      type: Foo,
      props: {},
      key: null,
      ref: null,
    }
    expect(describeValue(el)).toEqual({
      type: "react-node",
      component: { name: "CustomName", memo: false, forwardRef: false },
      props: {},
    })
  })

  it("handles host element (string type) in React element", () => {
    const el = {
      $$typeof: Symbol.for("react.element"),
      type: "div",
      props: { id: "root" },
      key: null,
      ref: null,
    }
    expect(describeValue(el)).toEqual({
      type: "react-node",
      component: { name: "div", memo: false, forwardRef: false },
      props: { id: "root" },
    })
  })

  it("excludes children from React element props", () => {
    const el = {
      $$typeof: Symbol.for("react.element"),
      type: "span",
      props: { className: "label", children: "Hello" },
      key: null,
      ref: null,
    }
    expect(describeValue(el)).toEqual({
      type: "react-node",
      component: { name: "span", memo: false, forwardRef: false },
      props: { className: "label" },
    })
  })

  it("handles React transitional element symbol", () => {
    const el = {
      $$typeof: Symbol.for("react.transitional.element"),
      type: "div",
      props: {},
      key: null,
      ref: null,
    }
    expect(describeValue(el)).toEqual({
      type: "react-node",
      component: { name: "div", memo: false, forwardRef: false },
      props: {},
    })
  })

  it("handles legacy numeric React element marker", () => {
    const el = {
      $$typeof: 0xeac7,
      type: "p",
      props: { style: { color: "red" } },
      key: null,
      ref: null,
    }
    expect(describeValue(el)).toEqual({
      type: "react-node",
      component: { name: "p", memo: false, forwardRef: false },
      props: { style: { color: "red" } },
    })
  })
})
