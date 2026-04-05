import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { snapshots } from "../store/index.js"
import { textResult } from "./utils/text-result.js"

export function register(server: McpServer): void {
  server.registerTool(
    "delete_snapshot",
    {
      title: "Delete Snapshot",
      description: "Deletes a saved render snapshot by name.",
      inputSchema: {
        name: z.string().describe("The name of the snapshot to delete."),
      },
    },
    async ({ name }) => {
      const deleted = snapshots.delete(name)
      if (!deleted) {
        return textResult(`Snapshot "${name}" not found.`)
      }
      return textResult(`Snapshot "${name}" deleted.`)
    },
  )
}
