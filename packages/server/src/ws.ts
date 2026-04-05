import http from "node:http"
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "@why-did-you-render-mcp/types"
import { Server } from "socket.io"
import type { IoServer } from "./io.js"
import { setIo } from "./io.js"
import {
  isGloballyPaused,
  isPaused,
  setPaused,
  setResumed,
} from "./pause-state.js"
import { registry, store } from "./store/index.js"

const RETRY_INTERVAL_MS = 3_000

function attachHandlers(io: IoServer, port: number) {
  io.on("connection", (socket) => {
    console.error(`[wdyr-mcp] browser connected (http://localhost:${port})`)
    socket.data.projectId = null
    if (isGloballyPaused()) socket.emit("pause")

    socket.on("render", (payload, projectId, commitId) => {
      socket.data.projectId = projectId
      if (isPaused(projectId)) return
      store.addRender(payload, projectId, commitId)
    })

    socket.on("render-batch", (payload, projectId, commitId) => {
      socket.data.projectId = projectId
      if (isPaused(projectId)) return
      for (const report of payload) {
        store.addRender(report, projectId, commitId)
      }
    })

    socket.on("register", (components, projectId) => {
      socket.data.projectId = projectId
      registry.setTrackedComponents(components, projectId)
      if (isPaused(projectId)) socket.emit("pause")
    })

    socket.on("config", (config, projectId) => {
      socket.data.projectId = projectId
      registry.setWdyrConfig(config, projectId)
      if (isPaused(projectId)) socket.emit("pause")
    })

    socket.on("relay-pause", async (projectId) => {
      setPaused(projectId ?? null)
      if (projectId) {
        const sockets = await io.fetchSockets()
        for (const s of sockets) {
          if (s.data.projectId === projectId) s.emit("pause")
        }
      } else {
        io.emit("pause")
      }
    })

    socket.on("hmr", (projectId) => {
      socket.data.projectId = projectId
      registry.recordHmr(projectId)
    })

    socket.on("relay-resume", async (projectId) => {
      setResumed(projectId ?? null)
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
