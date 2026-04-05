import type { UpdateInfo } from "@welldone-software/why-did-you-render"
import type { SafeReasonForUpdate } from "@why-did-you-render-mcp/types"
import { sanitizeDifferences } from "./sanitize-differences.js"

export function sanitizeReason(
  reason: UpdateInfo["reason"],
): SafeReasonForUpdate {
  return {
    propsDifferences: sanitizeDifferences(reason.propsDifferences),
    stateDifferences: sanitizeDifferences(reason.stateDifferences),
    hookDifferences: sanitizeDifferences(reason.hookDifferences),
  }
}
