import type { RenderReport } from "../types.js";

const renders: RenderReport[] = [];

export function addRender(info: RenderReport): void {
	renders.push(info);
}

export function getRenders(): RenderReport[] {
	return renders;
}

export function getRendersByComponent(componentName: string): RenderReport[] {
	return renders.filter((r) => r.displayName === componentName);
}

export function clearRenders(): void {
	renders.length = 0;
}

export function getSummary(): Record<string, number> {
	const summary: Record<string, number> = {};
	for (const r of renders) {
		summary[r.displayName] = (summary[r.displayName] ?? 0) + 1;
	}
	return summary;
}
