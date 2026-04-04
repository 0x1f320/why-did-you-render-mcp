import { WebSocketServer } from "ws"
import type { WsMessage } from "../types.js"
import { HeartbeatManager } from "./liveness.js"
import { store } from "./store/index.js"

export function createWsServer(port: number): WebSocketServer | null {
  const wss = new WebSocketServer({ port, host: "127.0.0.1" })
  const heartbeat = new HeartbeatManager(wss, store)

  wss.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `[wdyr-mcp] Port ${port} already in use, another instance owns the WS server. Skipping.`,
      )
    } else {
      console.error("[wdyr-mcp] WS server error:", err)
    }
  })

  wss.on("listening", () => {
    console.error(
      `[wdyr-mcp] WebSocket server listening on ws://localhost:${port}`,
    )
  })

  wss.on("connection", (ws) => {
    console.error(`[wdyr-mcp] browser connected (ws://localhost:${port})`)
    heartbeat.trackConnection(ws)

    ws.on("message", (raw) => {
      try {
        const msg: WsMessage = JSON.parse(String(raw))
        if (msg.type === "render") {
          const projectId = msg.projectId ?? "default"
          heartbeat.setProjectId(ws, projectId)
          store.addRender(msg.payload, projectId, msg.commitId)
        }
      } catch {
        console.error("[wdyr-mcp] invalid message received")
      }
    })

    ws.on("close", () => {
      console.error("[wdyr-mcp] browser disconnected")
    })
  })

  wss.on("close", () => {
    heartbeat.stop()
  })

  return wss
}
