/**
 * Server-side pause state.
 *
 * Tracks which projects are paused so the server can reject incoming renders
 * even if a client loses its local pause flag (e.g. after a page refresh).
 *
 * `null` key in the set means "all projects are paused globally".
 */

const paused = new Set<string | null>()

export function isGloballyPaused(): boolean {
  return paused.has(null)
}

export function isPaused(projectId: string): boolean {
  return paused.has(null) || paused.has(projectId)
}

export function setPaused(projectId: string | null): void {
  paused.add(projectId)
}

export function setResumed(projectId: string | null): void {
  if (projectId === null) {
    paused.clear()
  } else {
    paused.delete(projectId)
  }
}
