import type { RenderInfo } from "../types.js";

const renders: RenderInfo[] = [];

export function addRender(info: RenderInfo): void {
	renders.push(info);
}

export function getRenders(): RenderInfo[] {
	return renders;
}

export function getRendersByComponent(componentName: string): RenderInfo[] {
	return renders.filter((r) => r.componentName === componentName);
}

export function clearRenders(): void {
	renders.length = 0;
}

export function getSummary(): Record<string, number> {
	const summary: Record<string, number> = {};
	for (const r of renders) {
		summary[r.componentName] = (summary[r.componentName] ?? 0) + 1;
	}
	return summary;
}
