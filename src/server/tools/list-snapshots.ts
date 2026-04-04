import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { snapshots } from "../store/index.js"
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
      const list = snapshots.list()

      if (list.length === 0) {
        return textResult("No snapshots saved yet.")
      }

      const lines = list.map(
        (s) => `- ${s.name} (${new Date(s.timestamp).toISOString()})`,
      )
      return textResult(`Saved snapshots:\n\n${lines.join("\n")}`)
    },
  )
}
