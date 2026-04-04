import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { setIo } from "./io.js"
import { registerTools } from "./tools/index.js"
import { createWsServer } from "./ws.js"

const DEFAULT_WS_PORT = 4649

const server = new McpServer({
  name: "why-did-you-render",
  version: "0.0.0",
})

registerTools(server)

async function main() {
  const port = Number(process.env.WDYR_WS_PORT) || DEFAULT_WS_PORT
  const io = createWsServer(port)
  setIo(io)

  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error("[wdyr-mcp] MCP server running on stdio")

  let shuttingDown = false
  async function shutdown() {
    if (shuttingDown) return
    shuttingDown = true
    console.error("[wdyr-mcp] Shutting down…")
    io?.close()
    await server.close()
    process.exit(0)
  }

  process.stdin.on("end", shutdown)
  process.on("SIGTERM", shutdown)
  process.on("SIGINT", shutdown)
}

main().catch((error) => {
  console.error("[wdyr-mcp] Fatal error:", error)
  process.exit(1)
})
