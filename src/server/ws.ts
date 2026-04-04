import http from "node:http"
import { Server } from "socket.io"
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../types.js"
import type { IoServer } from "./io.js"
import { setIo } from "./io.js"
import { store } from "./store/index.js"

const RETRY_INTERVAL_MS = 3_000

function attachHandlers(io: IoServer, port: number) {
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

    socket.on("relay-pause", async (projectId) => {
      if (projectId) {
        const sockets = await io.fetchSockets()
        for (const s of sockets) {
          if (s.data.projectId === projectId) s.emit("pause")
        }
      } else {
        io.emit("pause")
      }
    })

    socket.on("relay-resume", async (projectId) => {
      if (projectId) {
        const sockets = await io.fetchSockets()
        for (const s of sockets) {
          if (s.data.projectId === projectId) s.emit("resume")
        }
      } else {
        io.emit("resume")
      }
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
}

export interface WsHandle {
  close(): void
}

export function createWsServer(port: number): WsHandle {
  let retryTimer: ReturnType<typeof setInterval> | null = null
  let io: Server | null = null
  let httpServer: http.Server | null = null
  let stopped = false

  function tryListen() {
    if (stopped) return

    httpServer = http.createServer()

    io = new Server<
      ClientToServerEvents,
      ServerToClientEvents,
      InterServerEvents,
      SocketData
    >(httpServer, {
      cors: { origin: "*" },
      serveClient: false,
      transports: ["websocket"],
      maxHttpBufferSize: 50e6,
    })

    attachHandlers(io, port)

    httpServer.once("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.error(
          `[wdyr-mcp] Port ${port} in use, will retry every ${RETRY_INTERVAL_MS / 1000}s`,
        )
        io?.close()
        io = null
        setIo(null)
        httpServer = null
        startRetry()
      } else {
        console.error("[wdyr-mcp] server error:", err)
      }
    })

    httpServer.listen(port, "127.0.0.1", () => {
      console.error(
        `[wdyr-mcp] socket.io server listening on http://localhost:${port}`,
      )
      setIo(io)
      stopRetry()
    })
  }

  function startRetry() {
    if (retryTimer || stopped) return
    retryTimer = setInterval(tryListen, RETRY_INTERVAL_MS)
  }

  function stopRetry() {
    if (!retryTimer) return
    clearInterval(retryTimer)
    retryTimer = null
  }

  tryListen()

  return {
    close() {
      stopped = true
      stopRetry()
      io?.close()
      setIo(null)
    },
  }
}
