import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { store } from "../store/index.js"
import { resolveProject } from "./utils/resolve-project.js"
import { textResult } from "./utils/text-result.js"

export function register(server: McpServer): void {
  server.registerTool(
    "get_renders_by_commit",
    {
      title: "Get Renders by Commit",
      description:
        "Returns all unnecessary re-renders for a specific React commit ID. Use get_commits first to discover available commit IDs.",
      inputSchema: {
        commitId: z.number().describe("The React commit ID to filter by."),
        project: z
          .string()
          .optional()
          .describe(
            "Project identifier (the browser's origin URL, e.g. http://localhost:3000). Omit to auto-detect.",
          ),
      },
    },
    async ({ commitId, project }) => {
      const resolved = resolveProject(project)
      if (resolved.error) return textResult(resolved.error)

      const renders = store.getRendersByCommit(commitId, resolved.projectId)

      if (renders.length === 0) {
        return textResult(`No renders recorded for commit ${commitId}.`)
      }

      return textResult(JSON.stringify(renders, null, 2))
    },
  )
}
