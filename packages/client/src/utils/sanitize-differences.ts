import type { SafeHookDifference } from "@why-did-you-render-mcp/types"
import { describeValue } from "./describe-value.js"

export function sanitizeDifferences(
  diffs: unknown,
): SafeHookDifference[] | false {
  if (!Array.isArray(diffs)) return false
  return diffs.map((diff) => ({
    pathString: diff.pathString,
    diffType: diff.diffType,
    prevValue: describeValue(diff.prevValue),
    nextValue: describeValue(diff.nextValue),
  }))
}
