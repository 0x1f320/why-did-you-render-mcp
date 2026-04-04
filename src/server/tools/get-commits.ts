import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { store } from "../store/index.js"
import { resolveProject } from "./utils/resolve-project.js"
import { textResult } from "./utils/text-result.js"

export function register(server: McpServer): void {
  server.registerTool(
    "get_commits",
    {
      title: "Get Commits",
      description:
        "Returns a list of React commit IDs that have recorded render data for a project. Use these IDs with get_renders_by_commit to inspect individual commits.",
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

      const commitIds = store.getCommitIds(resolved.projectId)

      if (commitIds.length === 0) {
        return textResult(
          "No commits recorded yet. Make sure the browser is connected and triggering re-renders.",
        )
      }

      return textResult(JSON.stringify(commitIds))
    },
  )
}
