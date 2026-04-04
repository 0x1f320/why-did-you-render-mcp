import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { store } from "../store/index.js"
import { resolveProject } from "./utils/resolve-project.js"
import { textResult } from "./utils/text-result.js"

export function register(server: McpServer): void {
  server.registerTool(
    "get_renders",
    {
      title: "Get Renders",
      description:
        "Returns all re-renders collected from the browser. If multiple projects are active and no project is specified, the tool will ask you to disambiguate by asking the user for their dev server URL.",
      inputSchema: {
        component: z
          .string()
          .optional()
          .describe("Filter by component name. Omit to get all renders."),
        project: z
          .string()
          .optional()
          .describe(
            "Project identifier (the browser's origin URL, e.g. http://localhost:3000). Omit to auto-detect.",
          ),
      },
    },
    async ({ component, project }) => {
      const resolved = resolveProject(project)
      if (resolved.error) return textResult(resolved.error)

      const renders = component
        ? store.getRendersByComponent(component, resolved.projectId)
        : store.getAllRenders(resolved.projectId)

      if (renders.length === 0) {
        return textResult(
          component
            ? `No renders recorded for "${component}".`
            : "No renders recorded yet. Make sure the browser is connected and triggering re-renders.",
        )
      }

      return textResult(JSON.stringify(renders, null, 2))
    },
  )
}
