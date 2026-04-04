import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { store } from "../store/index.js"
import { resolveProject } from "./utils/resolve-project.js"
import { textResult } from "./utils/text-result.js"

export function register(server: McpServer): void {
  server.registerTool(
    "clear_renders",
    {
      title: "Clear Renders",
      description:
        "Clears collected render data. Supports filtering by component name or by commit ID threshold. When no filter is given, clears all data. If multiple projects are active and no project is specified, the tool will ask you to disambiguate.",
      inputSchema: {
        project: z
          .string()
          .optional()
          .describe(
            "Project identifier (the browser's origin URL, e.g. http://localhost:3000). Omit to auto-detect.",
          ),
        component: z
          .string()
          .optional()
          .describe("Clear only renders for this component (by displayName)."),
        beforeCommit: z
          .number()
          .optional()
          .describe(
            "Clear all renders from commits with an ID strictly less than this value.",
          ),
      },
    },
    async ({ project, component, beforeCommit }) => {
      const resolved = resolveProject(project)
      if (resolved.error) return textResult(resolved.error)

      if (component) {
        const removed = store.clearRendersByComponent(
          component,
          resolved.projectId,
        )
        return textResult(
          `Cleared ${removed} render(s) for component "${component}".`,
        )
      }

      if (beforeCommit != null) {
        const deleted = store.clearRendersByCommit(
          beforeCommit,
          resolved.projectId,
        )
        return textResult(
          `Cleared renders from ${deleted} commit file(s) before commit #${beforeCommit}.`,
        )
      }

      store.clearRenders(resolved.projectId)
      return textResult(
        resolved.projectId
          ? `Render data cleared for ${resolved.projectId}.`
          : "All render data cleared.",
      )
    },
  )
}
