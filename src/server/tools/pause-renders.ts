import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { getIo } from "../io.js"
import { relayPause } from "../relay-client.js"
import { resolveProject } from "./utils/resolve-project.js"
import { textResult } from "./utils/text-result.js"

export function register(server: McpServer): void {
  server.registerTool(
    "pause_renders",
    {
      title: "Pause Render Collection",
      description:
        "Pauses render data collection in the browser. Connected clients will stop reporting renders until resume_renders is called. Useful when you want to ignore renders from irrelevant interactions. If multiple projects are active and no project is specified, the tool will ask you to disambiguate.",
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

      const io = getIo()

      if (!io) {
        relayPause(resolved.projectId ?? undefined)
        const target = resolved.projectId ?? "all projects"
        return textResult(
          `Paused render collection for ${target} (relayed via WS owner).`,
        )
      }

      if (resolved.projectId) {
        const sockets = await io.fetchSockets()
        for (const s of sockets) {
          if (s.data.projectId === resolved.projectId) {
            s.emit("pause")
          }
        }
        return textResult(`Paused render collection for ${resolved.projectId}.`)
      }

      io.emit("pause")
      return textResult("Paused render collection for all projects.")
    },
  )
}
