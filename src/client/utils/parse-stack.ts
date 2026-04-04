import ErrorStackParser from "error-stack-parser"
import type { StackFrame } from "../../types.js"

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

export function parseStack(error: Error): StackFrame[] {
  let parsed: ErrorStackParser.StackFrame[]
  try {
    parsed = ErrorStackParser.parse(error)
  } catch {
    return []
  }

  const frames: StackFrame[] = []

  for (const sf of parsed) {
    const file = sf.fileName ?? ""
    if (!file) continue
    if (isIgnoredFile(file)) continue

    const rawName = sf.functionName
    if (!rawName) continue
    if (isIgnoredName(rawName)) continue

    const name = cleanName(rawName)
    if (!name) continue

    frames.push({
      type: isHookName(name) ? "hook" : "component",
      name,
      location: { path: file, line: sf.lineNumber ?? 0 },
    })
  }

  return frames
}
