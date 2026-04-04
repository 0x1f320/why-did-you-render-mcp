import { existsSync, readFileSync } from "node:fs";
import type { StoredRender } from "../types.js";

export function readJsonl(file: string): StoredRender[] {
	if (!existsSync(file)) return [];

	return readFileSync(file, "utf-8")
		.split("\n")
		.filter(Boolean)
		.map((line) => JSON.parse(line) as StoredRender);
}
