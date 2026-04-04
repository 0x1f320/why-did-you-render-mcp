import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
	clearRenders,
	getRenders,
	getRendersByComponent,
	getSummary,
} from "./store.js";

export function registerTools(server: McpServer): void {
	server.registerTool(
		"get_unnecessary_renders",
		{
			title: "Get Unnecessary Renders",
			description:
				"Returns all unnecessary re-renders collected from the browser. Shows component names, reasons (props/state/hooks differences), and timestamps.",
			inputSchema: {
				component: z
					.string()
					.optional()
					.describe("Filter by component name. Omit to get all renders."),
			},
		},
		async ({ component }) => {
			const renders = component
				? getRendersByComponent(component)
				: getRenders();

			if (renders.length === 0) {
				return {
					content: [
						{
							type: "text" as const,
							text: component
								? `No unnecessary renders recorded for "${component}".`
								: "No unnecessary renders recorded yet. Make sure the browser is connected and triggering re-renders.",
						},
					],
				};
			}

			return {
				content: [
					{
						type: "text" as const,
						text: JSON.stringify(renders, null, 2),
					},
				],
			};
		},
	);

	server.registerTool(
		"get_render_summary",
		{
			title: "Get Render Summary",
			description:
				"Returns a summary of unnecessary re-renders grouped by component name with counts.",
			inputSchema: {},
		},
		async () => {
			const summary = getSummary();
			const entries = Object.entries(summary);

			if (entries.length === 0) {
				return {
					content: [
						{
							type: "text" as const,
							text: "No unnecessary renders recorded yet.",
						},
					],
				};
			}

			const lines = entries
				.sort(([, a], [, b]) => b - a)
				.map(([name, count]) => `${name}: ${count} re-render(s)`);

			return {
				content: [
					{
						type: "text" as const,
						text: `Unnecessary re-render summary:\n\n${lines.join("\n")}`,
					},
				],
			};
		},
	);

	server.registerTool(
		"clear_renders",
		{
			title: "Clear Renders",
			description: "Clears all collected render data.",
			inputSchema: {},
		},
		async () => {
			clearRenders();
			return {
				content: [{ type: "text" as const, text: "All render data cleared." }],
			};
		},
	);
}
