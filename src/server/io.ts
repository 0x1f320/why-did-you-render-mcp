import type { Server } from "socket.io"
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../types.js"

export type IoServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>

let instance: IoServer | null = null

export function setIo(io: IoServer | null): void {
  instance = io
}

export function getIo(): IoServer | null {
  return instance
}
