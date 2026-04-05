import { TraceMap, originalPositionFor } from "@jridgewell/trace-mapping"
import type { StackFrameLocation } from "@why-did-you-render-mcp/types"

const cache = new Map<string, Promise<TraceMap | null>>()

function fetchTraceMap(url: string): Promise<TraceMap | null> {
  const existing = cache.get(url)
  if (existing) return existing

  const promise = (async (): Promise<TraceMap | null> => {
    try {
      const res = await fetch(`${url}.map`)
      if (!res.ok) return null
      const json = await res.json()
      return new TraceMap(json)
    } catch {
      return null
    }
  })()

  cache.set(url, promise)
  return promise
}

export async function resolveLocation(
  path: string,
  line: number,
  column: number,
): Promise<StackFrameLocation> {
  const map = await fetchTraceMap(path)
  if (!map) return { path, line }

  const pos = originalPositionFor(map, { line, column })
  if (pos.source) {
    return { path: pos.source, line: pos.line ?? line }
  }
  return { path, line }
}
