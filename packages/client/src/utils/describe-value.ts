import type { ReactNodeValue, SafeValue } from "@why-did-you-render-mcp/types"

const MAX_DEPTH = 8

const REACT_ELEMENT_SYMBOL = Symbol.for("react.element")
const REACT_TRANSITIONAL_ELEMENT_SYMBOL = Symbol.for(
  "react.transitional.element",
)
const REACT_MEMO_TYPE = Symbol.for("react.memo")
const REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref")

interface ReactElement {
  $$typeof: symbol | number
  type: unknown
  props: Record<string, unknown>
}

function isReactElement(value: unknown): value is ReactElement {
  if (typeof value !== "object" || value === null) return false
  const v = value as Record<string, unknown>
  return (
    v.$$typeof === REACT_ELEMENT_SYMBOL ||
    v.$$typeof === REACT_TRANSITIONAL_ELEMENT_SYMBOL ||
    v.$$typeof === 0xeac7
  )
}

function resolveComponentInfo(type: unknown): {
  name: string
  memo: boolean
  forwardRef: boolean
} {
  let memo = false
  let forwardRef = false
  let current = type

  // Unwrap memo/forwardRef wrappers
  for (let i = 0; i < 5; i++) {
    if (typeof current !== "object" || current === null) break
    const wrapper = current as {
      $$typeof?: symbol
      type?: unknown
      render?: unknown
    }
    if (wrapper.$$typeof === REACT_MEMO_TYPE) {
      memo = true
      current = wrapper.type
    } else if (wrapper.$$typeof === REACT_FORWARD_REF_TYPE) {
      forwardRef = true
      current = wrapper.render
    } else {
      break
    }
  }

  let name = "Unknown"
  if (typeof current === "string") {
    name = current
  } else if (typeof current === "function") {
    name =
      (current as { displayName?: string }).displayName ||
      current.name ||
      "Anonymous"
  }

  return { name, memo, forwardRef }
}

function serializeReactElement(
  el: ReactElement,
  seen: WeakSet<object>,
  depth: number,
): ReactNodeValue {
  const component = resolveComponentInfo(el.type)
  const props: { [key: string]: SafeValue } = {}
  if (el.props && typeof el.props === "object") {
    for (const key of Object.keys(el.props)) {
      if (key === "children") continue
      props[key] = serialize(el.props[key], seen, depth + 1)
    }
  }
  return { type: "react-node", component, props }
}

function serialize(
  value: unknown,
  seen: WeakSet<object>,
  depth: number,
): SafeValue {
  if (value === null) return null
  if (value === undefined) return null
  if (typeof value === "function")
    return { type: "function", name: value.name || "anonymous" }
  if (typeof value === "boolean") return value
  if (typeof value === "number") {
    if (Number.isNaN(value)) return "NaN"
    if (!Number.isFinite(value)) return value > 0 ? "Infinity" : "-Infinity"
    if (Object.is(value, -0)) return "-0"
    return value
  }
  if (typeof value === "string") return value
  if (typeof value === "bigint") return value.toString()
  if (typeof value === "symbol") return value.toString()
  if (seen.has(value as object)) return "[Circular]"
  if (depth >= MAX_DEPTH) return "[MaxDepth]"

  seen.add(value as object)

  if (isReactElement(value)) {
    return serializeReactElement(value, seen, depth)
  }

  if (Array.isArray(value)) {
    return value.map((item) => serialize(item, seen, depth + 1))
  }

  const proto = Object.getPrototypeOf(value)
  const ctorName = proto?.constructor?.name
  if (ctorName && ctorName !== "Object") {
    if (value instanceof Date) return value.toISOString()
    if (value instanceof RegExp) return String(value)
    if (value instanceof Map) {
      const entries: { [key: string]: SafeValue } = {}
      for (const [k, v] of value.entries()) {
        entries[String(k)] = serialize(v, seen, depth + 1)
      }
      return { type: "Map", entries }
    }
    if (value instanceof Set) {
      return {
        type: "Set",
        values: [...value].map((v) => serialize(v, seen, depth + 1)),
      }
    }
    if (value instanceof Promise) return "Promise"
    if (value instanceof Error)
      return { type: "Error", name: value.name, message: value.message }
    if (
      typeof Node !== "undefined" &&
      value instanceof Node &&
      value instanceof Element
    ) {
      const attrs: { [key: string]: string } = {}
      for (const attr of value.attributes) {
        attrs[attr.name] = attr.value
      }
      return { type: "dom", tagName: value.tagName.toLowerCase(), attrs }
    }
    return { type: "class", name: ctorName }
  }

  const result: { [key: string]: SafeValue } = {}
  for (const key of Object.keys(value as Record<string, unknown>)) {
    result[key] = serialize(
      (value as Record<string, unknown>)[key],
      seen,
      depth + 1,
    )
  }
  return result
}

export function describeValue(value: unknown): SafeValue {
  return serialize(value, new WeakSet(), 0)
}
