import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { store } from "../store/index.js"
import { resolveProject } from "./utils/resolve-project.js"
import { textResult } from "./utils/text-result.js"

export function register(server: McpServer): void {
  server.registerTool(
    "get_render_summary",
    {
      title: "Get Render Summary",
      description:
        "Returns a summary of unnecessary re-renders grouped by component name with counts. Use groupBy: 'commit' to get per-commit breakdowns instead of a single aggregate. If multiple projects are active and no project is specified, the tool will ask you to disambiguate.",
      inputSchema: {
        project: z
          .string()
          .optional()
          .describe(
            "Project identifier (the browser's origin URL, e.g. http://localhost:3000). Omit to auto-detect.",
          ),
        groupBy: z
          .enum(["commit"])
          .optional()
          .describe(
            "Group results by commit. When set to 'commit', returns per-commit render summaries instead of a single aggregate.",
          ),
      },
    },
    async ({ project, groupBy }) => {
      const resolved = resolveProject(project)
      if (resolved.error) return textResult(resolved.error)

      if (groupBy === "commit") {
        return commitSummary(resolved.projectId)
      }

      return aggregateSummary(resolved.projectId)
    },
  )
}

function aggregateSummary(projectId?: string) {
  const summary = store.getSummary(projectId)

  if (Object.keys(summary).length === 0) {
    return textResult("No unnecessary renders recorded yet.")
  }

  const lines: string[] = []
  for (const [proj, components] of Object.entries(summary)) {
    lines.push(`[${proj}]`)
    for (const [name, count] of Object.entries(components)) {
      lines.push(`  ${name}: ${count} re-render(s)`)
    }
  }

  return textResult(`Unnecessary re-render summary:\n\n${lines.join("\n")}`)
}

function commitSummary(projectId?: string) {
  const summary = store.getSummaryByCommit(projectId)

  if (Object.keys(summary).length === 0) {
    return textResult("No unnecessary renders with commit IDs recorded yet.")
  }

  const lines: string[] = []
  for (const [proj, commits] of Object.entries(summary)) {
    lines.push(`[${proj}]`)
    const sortedCommitIds = Object.keys(commits)
      .map(Number)
      .sort((a, b) => a - b)
    for (const commitId of sortedCommitIds) {
      const components = commits[commitId]
      const total = Object.values(components).reduce((s, c) => s + c, 0)
      lines.push(`  Commit #${commitId} (${total} re-render(s)):`)
      for (const [name, count] of Object.entries(components)) {
        lines.push(`    ${name}: ${count}`)
      }
    }
  }

  return textResult(
    `Unnecessary re-render summary (by commit):\n\n${lines.join("\n")}`,
  )
}
