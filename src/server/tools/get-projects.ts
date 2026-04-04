import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { store } from "../store/index.js";
import { textResult } from "./utils/text-result.js";

export function register(server: McpServer): void {
	server.registerTool(
		"get_projects",
		{
			title: "Get Projects",
			description:
				"Returns a list of project identifiers (browser origin URLs) that have recorded render data.",
			inputSchema: {},
		},
		async () => {
			const projects = store.getProjects();

			if (projects.length === 0) {
				return textResult(
					"No projects have recorded render data yet.",
				);
			}

			return textResult(
				`Active projects:\n${projects.map((p) => `- ${p}`).join("\n")}`,
			);
		},
	);
}
