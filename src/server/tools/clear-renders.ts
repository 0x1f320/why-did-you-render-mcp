import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { store } from "../store/index.js";
import { resolveProject } from "./utils/resolve-project.js";
import { textResult } from "./utils/text-result.js";

export function register(server: McpServer): void {
	server.registerTool(
		"clear_renders",
		{
			title: "Clear Renders",
			description:
				"Clears collected render data. If multiple projects are active and no project is specified, the tool will ask you to disambiguate.",
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

			store.clearRenders(resolved.projectId);
			return textResult(
				resolved.projectId
					? `Render data cleared for ${resolved.projectId}.`
					: "All render data cleared.",
			);
		},
	);
}
