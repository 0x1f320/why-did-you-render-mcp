import type { WebSocket, WebSocketServer } from "ws"
import type { RenderStore } from "./store/index.js"

const DEFAULT_INTERVAL_MS = 30_000

interface ConnectionMeta {
  isAlive: boolean
  projectId: string | null
}

export class HeartbeatManager {
  private readonly connections = new Map<WebSocket, ConnectionMeta>()
  private readonly timer: ReturnType<typeof setInterval>

  constructor(
    private readonly wss: WebSocketServer,
    private readonly store: RenderStore,
    intervalMs = DEFAULT_INTERVAL_MS,
  ) {
    this.timer = setInterval(() => this.check(), intervalMs)
  }

  trackConnection(ws: WebSocket): void {
    this.connections.set(ws, { isAlive: true, projectId: null })

    ws.on("pong", () => {
      const meta = this.connections.get(ws)
      if (meta) meta.isAlive = true
    })

    ws.on("close", () => {
      this.connections.delete(ws)
    })
  }

  setProjectId(ws: WebSocket, projectId: string): void {
    const meta = this.connections.get(ws)
    if (meta) meta.projectId = projectId
  }

  stop(): void {
    clearInterval(this.timer)
    this.connections.clear()
  }

  private check(): void {
    for (const [ws, meta] of this.connections) {
      if (!meta.isAlive) {
        this.connections.delete(ws)
        ws.terminate()

        if (meta.projectId && !this.hasOtherConnection(ws, meta.projectId)) {
          console.error(
            `[wdyr-mcp] client for ${meta.projectId} is dead, clearing render data`,
          )
          this.store.clearRenders(meta.projectId)
        }
        continue
      }

      meta.isAlive = false
      ws.ping()
    }
  }

  private hasOtherConnection(deadWs: WebSocket, projectId: string): boolean {
    for (const [ws, meta] of this.connections) {
      if (ws !== deadWs && meta.projectId === projectId) return true
    }
    return false
  }
}
