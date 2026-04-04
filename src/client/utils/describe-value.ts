export function describeValue(value: unknown): string {
  if (value === null) return "null"
  if (value === undefined) return "undefined"
  if (typeof value === "function")
    return `function ${value.name || "anonymous"}`
  if (typeof value !== "object") return String(value)
  if (Array.isArray(value)) return `Array(${value.length})`
  const proto = Object.getPrototypeOf(value)
  const name = proto?.constructor?.name
  if (name && name !== "Object") return name
  return "Object"
}
