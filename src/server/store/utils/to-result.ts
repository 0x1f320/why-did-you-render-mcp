import type { RenderWithProject, StoredRender } from "../types.js";

export function toResult(stored: StoredRender): RenderWithProject {
	return {
		project: stored.projectId,
		displayName: stored.displayName,
		reason: stored.reason,
		...(stored.hookName != null && { hookName: stored.hookName }),
	};
}
