import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { store } from "../store/index.js";
import { resolveProject } from "./utils/resolve-project.js";
import { textResult } from "./utils/text-result.js";

export function register(server: McpServer): void {
	server.registerTool(
		"get_render_summary",
		{
			title: "Get Render Summary",
			description:
				"Returns a summary of unnecessary re-renders grouped by component name with counts. If multiple projects are active and no project is specified, the tool will ask you to disambiguate.",
			inputSchema: {
				project: z
					.string()
					.optional()
					.describe(
						"Project identifier (the browser's origin URL, e.g. http://localhost:3000). Omit to auto-detect.",
					),
			},
		},
		async ({ project }) => {
			const resolved = resolveProject(project);
			if (resolved.error) return textResult(resolved.error);

			const summary = store.getSummary(resolved.projectId);

			if (Object.keys(summary).length === 0) {
				return textResult("No unnecessary renders recorded yet.");
			}

			const lines: string[] = [];
			for (const [projectId, components] of Object.entries(summary)) {
				lines.push(`[${projectId}]`);
				for (const [name, count] of Object.entries(components)) {
					lines.push(`  ${name}: ${count} re-render(s)`);
				}
			}

			return textResult(
				`Unnecessary re-render summary:\n\n${lines.join("\n")}`,
			);
		},
	);
}
