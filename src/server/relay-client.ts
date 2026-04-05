import { type Socket, io as ioClient } from "socket.io-client"
import type { ClientToServerEvents, ServerToClientEvents } from "../types.js"

type RelaySocket = Socket<ServerToClientEvents, ClientToServerEvents>

let socket: RelaySocket | null = null
let port = 4649

export function initRelayClient(wsPort: number): void {
  port = wsPort
}

function getSocket(): RelaySocket {
  if (!socket) {
    socket = ioClient(`http://127.0.0.1:${port}`, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 3,
    })
  }
  return socket
}

export function relayPause(projectId?: string): void {
  getSocket().emit("relay-pause", projectId)
}

export function relayResume(projectId?: string): void {
  getSocket().emit("relay-resume", projectId)
}

export function closeRelayClient(): void {
  if (socket) {
    socket.close()
    socket = null
  }
}
