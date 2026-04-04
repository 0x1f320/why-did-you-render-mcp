import type { UpdateInfo } from "../../types.js";
import type { SafeReasonForUpdate } from "../../types.js";
import { sanitizeDifferences } from "./sanitize-differences.js";

export function sanitizeReason(
	reason: UpdateInfo["reason"],
): SafeReasonForUpdate {
	return {
		propsDifferences: sanitizeDifferences(reason.propsDifferences),
		stateDifferences: sanitizeDifferences(reason.stateDifferences),
		hookDifferences: sanitizeDifferences(reason.hookDifferences),
	};
}
