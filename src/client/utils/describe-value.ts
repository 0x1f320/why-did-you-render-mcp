const MAX_DEPTH = 4
const MAX_LENGTH = 1024

function serialize(
  value: unknown,
  seen: WeakSet<object>,
  depth: number,
): unknown {
  if (value === null || value === undefined) return value
  if (typeof value === "function")
    return `[Function: ${value.name || "anonymous"}]`
  if (typeof value !== "object") return value
  if (seen.has(value)) return "[Circular]"
  if (depth >= MAX_DEPTH) {
    if (Array.isArray(value)) return `[Array(${value.length})]`
    const name = Object.getPrototypeOf(value)?.constructor?.name
    return name && name !== "Object" ? `[${name}]` : "[Object]"
  }

  seen.add(value)

  if (Array.isArray(value)) {
    return value.map((item) => serialize(item, seen, depth + 1))
  }

  const proto = Object.getPrototypeOf(value)
  const ctorName = proto?.constructor?.name
  if (ctorName && ctorName !== "Object") {
    // Built-in types like Date, Map, Set, RegExp
    if (value instanceof Date) return value.toISOString()
    if (value instanceof RegExp) return String(value)
    if (value instanceof Map)
      return `Map(${value.size}){${[...value.entries()]
        .slice(0, 5)
        .map(
          ([k, v]) =>
            `${serialize(k, seen, depth + 1)} => ${serialize(v, seen, depth + 1)}`,
        )
        .join(", ")}}`
    if (value instanceof Set)
      return `Set(${value.size}){${[...value]
        .slice(0, 5)
        .map((v) => serialize(v, seen, depth + 1))
        .join(", ")}}`
    return `[${ctorName}]`
  }

  const result: Record<string, unknown> = {}
  for (const key of Object.keys(value as Record<string, unknown>)) {
    result[key] = serialize(
      (value as Record<string, unknown>)[key],
      seen,
      depth + 1,
    )
  }
  return result
}

export function describeValue(
  value: unknown,
): string | number | boolean | { type: "function"; name: string } {
  if (value === null) return "null"
  if (value === undefined) return "undefined"
  if (typeof value === "function")
    return { type: "function", name: value.name || "anonymous" }
  if (typeof value === "number" || typeof value === "boolean") return value
  if (typeof value !== "object") return String(value)

  const serialized = serialize(value, new WeakSet(), 0)
  const json = JSON.stringify(serialized)
  if (json.length > MAX_LENGTH) return `${json.slice(0, MAX_LENGTH)}…`
  return json
}
