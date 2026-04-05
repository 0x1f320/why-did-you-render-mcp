import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { snapshots, store, summarize } from "../store/index.js"
import { resolveProject } from "./utils/resolve-project.js"
import { textResult } from "./utils/text-result.js"

export function register(server: McpServer): void {
  server.registerTool(
    "save_snapshot",
    {
      title: "Save Snapshot",
      description:
        "Saves the current render summary as a named snapshot for later comparison. If multiple projects are active and no project is specified, the tool will ask you to disambiguate.",
      inputSchema: {
        name: z
          .string()
          .describe("A name for this snapshot (used to reference it later)."),
        project: z
          .string()
          .optional()
          .describe(
            "Project identifier (the browser's origin URL, e.g. http://localhost:3000). Omit to auto-detect.",
          ),
      },
    },
    async ({ name, project }) => {
      const resolved = resolveProject(project)
      if (resolved.error) return textResult(resolved.error)

      snapshots.save(name, summarize(store.getAllRenders(resolved.projectId)))
      return textResult(`Snapshot "${name}" saved.`)
    },
  )
}
