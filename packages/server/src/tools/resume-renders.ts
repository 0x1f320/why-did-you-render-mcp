import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { getIo } from "../io.js"
import { setResumed } from "../pause-state.js"
import { relayResume } from "../relay-client.js"
import { resolveProject } from "./utils/resolve-project.js"
import { textResult } from "./utils/text-result.js"

export function register(server: McpServer): void {
  server.registerTool(
    "resume_renders",
    {
      title: "Resume Render Collection",
      description:
        "Resumes render data collection that was previously paused with pause_renders. Connected clients will start reporting renders again. If multiple projects are active and no project is specified, the tool will ask you to disambiguate.",
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

      setResumed(resolved.projectId ?? null)

      const io = getIo()

      if (!io) {
        relayResume(resolved.projectId ?? undefined)
        const target = resolved.projectId ?? "all projects"
        return textResult(
          `Resumed render collection for ${target} (relayed via WS owner).`,
        )
      }

      if (resolved.projectId) {
        const sockets = await io.fetchSockets()
        for (const s of sockets) {
          if (s.data.projectId === resolved.projectId) {
            s.emit("resume")
          }
        }
        return textResult(
          `Resumed render collection for ${resolved.projectId}.`,
        )
      }

      io.emit("resume")
      return textResult("Resumed render collection for all projects.")
    },
  )
}
