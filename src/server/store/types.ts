import type { RenderReport } from "../../types.js";

export interface StoredRender extends RenderReport {
	projectId: string;
}

export interface RenderWithProject extends RenderReport {
	project: string;
}
