import ErrorStackParser from "error-stack-parser"
import type { StackFrame } from "../../types.js"
import { resolveLocation } from "./resolve-source-map.js"

const IGNORED_FILES = [
  "whyDidYouRender",
  "react-dom",
  "react.development",
  "react.production",
  "scheduler.",
  "installHook",
  "console.",
]

const IGNORED_NAMES = [
  "trackHookChanges",
  "WDYRFunctionalComponent",
  "Object.notifier",
  "notifier",
  "console.trace",
]

/**
 * Known React reconciler / scheduler internal function names.
 * When all code is bundled into a single file (e.g. bundle.js),
 * file-path based filtering fails — these must be filtered by name.
 */
const REACT_INTERNALS = new Set([
  // Reconciler — render phase
  "renderWithHooks",
  "mountIndeterminateComponent",
  "updateFunctionComponent",
  "updateForwardRef",
  "updateMemoComponent",
  "updateSimpleMemoComponent",
  "beginWork",
  "beginWork$1",
  "completeWork",
  "completeUnitOfWork",
  "performUnitOfWork",
  "runWithFiberInDEV",
  "callComponentInDEV",
  // Reconciler — work loop
  "workLoopSync",
  "workLoopConcurrent",
  "renderRootSync",
  "renderRootConcurrent",
  "performWorkOnRoot",
  "performSyncWorkOnRoot",
  "performConcurrentWorkOnRoot",
  // Reconciler — commit phase
  "commitRoot",
  "commitRootImpl",
  "commitMutationEffects",
  "commitMutationEffectsOnFiber",
  "commitLayoutEffects",
  "commitLayoutEffectOnFiber",
  "flushPassiveEffects",
  "flushPassiveEffectsImpl",
  // Reconciler — scheduling
  "flushSyncWorkAcrossRoots_impl",
  "processRootScheduleInMicrotask",
  "scheduleUpdateOnFiber",
  "ensureRootIsScheduled",
  // Reconciler — special frames
  "react_stack_bottom_frame",
  // Reconciler — hooks internals
  "dispatchSetState",
  "dispatchReducerAction",
  "dispatchAction",
  "mountState",
  "updateState",
  "mountReducer",
  "updateReducer",
  "mountMemo",
  "updateMemo",
  "mountEffect",
  "updateEffect",
  "mountLayoutEffect",
  "updateLayoutEffect",
  "mountRef",
  "updateRef",
  // Scheduler
  "flushWork",
  "performWorkUntilDeadline",
])

function isIgnoredFile(path: string): boolean {
  return IGNORED_FILES.some((f) => path.includes(f))
}

function isIgnoredName(name: string): boolean {
  return IGNORED_NAMES.some((n) => name === n)
}

function stripWdyrSuffix(name: string): string {
  return name.replace(/WDYR$/, "")
}

function cleanName(raw: string): string {
  // "new ErrorBoundary" → "ErrorBoundary"
  const withoutNew = raw.startsWith("new ") ? raw.slice(4) : raw
  // "Object.notifier" → "notifier"
  const dotIdx = withoutNew.lastIndexOf(".")
  const name = dotIdx >= 0 ? withoutNew.slice(dotIdx + 1) : withoutNew
  return stripWdyrSuffix(name)
}

function isHookName(name: string): boolean {
  return /^use[A-Z]/.test(name)
}

interface Candidate {
  type: "hook" | "component"
  name: string
  file: string
  line: number
  column: number
}

function collectCandidates(error: Error): Candidate[] {
  let parsed: ErrorStackParser.StackFrame[]
  try {
    parsed = ErrorStackParser.parse(error)
  } catch {
    return []
  }

  const candidates: Candidate[] = []

  for (const sf of parsed) {
    const file = sf.fileName ?? ""
    if (!file) continue
    if (isIgnoredFile(file)) continue

    const rawName = sf.functionName
    if (!rawName) continue
    if (isIgnoredName(rawName)) continue

    const name = cleanName(rawName)
    if (!name) continue
    if (REACT_INTERNALS.has(name)) continue

    candidates.push({
      type: isHookName(name) ? "hook" : "component",
      name,
      file,
      line: sf.lineNumber ?? 0,
      column: sf.columnNumber ?? 0,
    })
  }

  return candidates
}

export async function parseStack(error: Error): Promise<StackFrame[]> {
  const candidates = collectCandidates(error)
  if (candidates.length === 0) return []

  return Promise.all(
    candidates.map(async (c) => ({
      type: c.type,
      name: c.name,
      location: await resolveLocation(c.file, c.line, c.column),
    })),
  )
}

/** Synchronous variant — skips source map resolution. */
export function parseStackSync(error: Error): StackFrame[] {
  return collectCandidates(error).map((c) => ({
    type: c.type,
    name: c.name,
    location: { path: c.file, line: c.line },
  }))
}
