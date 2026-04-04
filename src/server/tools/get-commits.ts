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
        "Returns a list of render commits (batches of re-renders triggered by the same interaction) with metadata including timestamp, render count, and involved components.",
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

      const commits = store.getCommits(resolved.projectId)
      if (commits.length === 0) {
        return textResult("No render commits recorded yet.")
      }

      return textResult(JSON.stringify(commits, null, 2))
    },
  )
}
