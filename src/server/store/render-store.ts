import {
	mkdirSync,
	appendFileSync,
	readFileSync,
	unlinkSync,
	readdirSync,
	existsSync,
} from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { RenderReport } from "../../types.js";
import type { RenderWithProject, StoredRender } from "./types.js";
import { toResult } from "./utils/to-result.js";
import { sanitizeProjectId } from "./utils/sanitize-project-id.js";
import { readJsonl } from "./utils/read-jsonl.js";

export class RenderStore {
	private readonly dir: string;

	constructor(dir?: string) {
		this.dir = dir ?? join(homedir(), ".wdyr-mcp", "renders");
		mkdirSync(this.dir, { recursive: true });
	}

	addRender(report: RenderReport, projectId: string): void {
		const stored: StoredRender = { ...report, projectId };
		appendFileSync(
			this.projectFile(projectId),
			`${JSON.stringify(stored)}\n`,
		);
	}

	getAllRenders(projectId?: string): RenderWithProject[] {
		if (projectId) {
			return readJsonl(this.projectFile(projectId)).map(toResult);
		}

		return this.jsonlFiles().flatMap((f) =>
			readJsonl(join(this.dir, f)).map(toResult),
		);
	}

	getRendersByComponent(
		componentName: string,
		projectId?: string,
	): RenderWithProject[] {
		return this.getAllRenders(projectId).filter(
			(r) => r.displayName === componentName,
		);
	}

	clearRenders(projectId?: string): void {
		if (projectId) {
			const file = this.projectFile(projectId);
			if (existsSync(file)) unlinkSync(file);
		} else {
			for (const f of this.jsonlFiles()) {
				unlinkSync(join(this.dir, f));
			}
		}
	}

	getProjects(): string[] {
		const projects = new Set<string>();

		for (const f of this.jsonlFiles()) {
			const firstLine = readFileSync(join(this.dir, f), "utf-8").split(
				"\n",
			)[0];
			if (!firstLine) continue;
			const stored = JSON.parse(firstLine) as StoredRender;
			projects.add(stored.projectId);
		}

		return [...projects];
	}

	getSummary(
		projectId?: string,
	): Record<string, Record<string, number>> {
		const renders = this.getAllRenders(projectId);
		const summary: Record<string, Record<string, number>> = {};

		for (const r of renders) {
			const project = (summary[r.project] ??= {});
			project[r.displayName] = (project[r.displayName] ?? 0) + 1;
		}

		return summary;
	}

	private projectFile(projectId: string): string {
		return join(this.dir, `${sanitizeProjectId(projectId)}.jsonl`);
	}

	private jsonlFiles(): string[] {
		return readdirSync(this.dir).filter((f) => f.endsWith(".jsonl"));
	}
}
