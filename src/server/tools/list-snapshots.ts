import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { store } from "../store/index.js"
import { textResult } from "./utils/text-result.js"

export function register(server: McpServer): void {
  server.registerTool(
    "list_snapshots",
    {
      title: "List Snapshots",
      description: "Lists all saved render snapshots with their timestamps.",
      inputSchema: {},
    },
    async () => {
      const snapshots = store.listSnapshots()

      if (snapshots.length === 0) {
        return textResult("No snapshots saved yet.")
      }

      const lines = snapshots.map(
        (s) => `- ${s.name} (${new Date(s.timestamp).toISOString()})`,
      )
      return textResult(`Saved snapshots:\n\n${lines.join("\n")}`)
    },
  )
}
