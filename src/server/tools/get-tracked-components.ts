import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { store } from "../store/index.js"
import { resolveProject } from "./utils/resolve-project.js"
import { textResult } from "./utils/text-result.js"

export function register(server: McpServer): void {
  server.registerTool(
    "get_tracked_components",
    {
      title: "Get Tracked Components",
      description:
        "Returns the list of components being tracked by why-did-you-render. Shows both explicitly registered components (sent by the client) and components observed in render data. If multiple projects are active and no project is specified, the tool will ask you to disambiguate.",
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
      const resolved = resolveProject(project)
      if (resolved.error) return textResult(resolved.error)

      const tracked = store.getTrackedComponents(resolved.projectId)

      if (Object.keys(tracked).length === 0) {
        return textResult(
          "No tracked components found. Make sure the browser is connected and triggering re-renders.",
        )
      }

      const lines: string[] = []
      for (const [proj, { registered, observed }] of Object.entries(tracked)) {
        lines.push(`[${proj}]`)
        if (registered.length > 0) {
          lines.push("  Registered:")
          for (const name of registered) {
            lines.push(`    - ${name}`)
          }
        }
        if (observed.length > 0) {
          lines.push("  Observed in renders:")
          for (const name of observed) {
            lines.push(`    - ${name}`)
          }
        }
        if (registered.length === 0 && observed.length === 0) {
          lines.push("  No components tracked yet.")
        }
      }

      return textResult(lines.join("\n"))
    },
  )
}
