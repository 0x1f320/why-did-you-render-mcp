import http from "node:http"
import { Server } from "socket.io"
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../types.js"
import { store } from "./store/index.js"

export function createWsServer(port: number): Server | null {
  const httpServer = http.createServer()

  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: { origin: "*" },
    serveClient: false,
  })

  io.on("connection", (socket) => {
    console.error(`[wdyr-mcp] browser connected (http://localhost:${port})`)
    socket.data.projectId = null

    socket.on("render", (payload, projectId, commitId) => {
      socket.data.projectId = projectId
      store.addRender(payload, projectId, commitId)
    })

    socket.on("render-batch", (payload, projectId, commitId) => {
      socket.data.projectId = projectId
      for (const report of payload) {
        store.addRender(report, projectId, commitId)
      }
    })

    socket.on("register", (components, projectId) => {
      socket.data.projectId = projectId
      store.setTrackedComponents(components, projectId)
    })

    socket.on("config", (config, projectId) => {
      socket.data.projectId = projectId
      store.setWdyrConfig(config, projectId)
    })

    socket.on("disconnect", () => {
      console.error("[wdyr-mcp] browser disconnected")
      const projectId = socket.data.projectId
      if (!projectId) return

      const remaining = [...io.sockets.sockets.values()].some(
        (s) => s.id !== socket.id && s.data.projectId === projectId,
      )

      if (!remaining) {
        console.error(
          `[wdyr-mcp] last client for ${projectId} disconnected, clearing render data`,
        )
        store.clearRenders(projectId)
      }
    })
  })

  httpServer.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `[wdyr-mcp] Port ${port} already in use, another instance owns the WS server. Skipping.`,
      )
    } else {
      console.error("[wdyr-mcp] server error:", err)
    }
  })

  httpServer.listen(port, "127.0.0.1", () => {
    console.error(
      `[wdyr-mcp] socket.io server listening on http://localhost:${port}`,
    )
  })

  return io
}
