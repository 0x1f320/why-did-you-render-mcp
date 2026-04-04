import type { SafeValue } from "../../types.js"

const MAX_DEPTH = 8

function serialize(
  value: unknown,
  seen: WeakSet<object>,
  depth: number,
): SafeValue {
  if (value === null) return null
  if (value === undefined) return null
  if (typeof value === "function")
    return { type: "function", name: value.name || "anonymous" }
  if (typeof value === "number" || typeof value === "boolean") return value
  if (typeof value === "string") return value
  if (typeof value === "bigint") return value.toString()
  if (typeof value === "symbol") return value.toString()
  if (seen.has(value as object)) return "[Circular]"
  if (depth >= MAX_DEPTH) return "[MaxDepth]"

  seen.add(value as object)

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
