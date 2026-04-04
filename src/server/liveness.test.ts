import { EventEmitter } from "node:events"
import { mkdirSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  type Mock,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"
import type { WebSocket, WebSocketServer } from "ws"
import type { RenderReport } from "../types.js"
import { HeartbeatManager } from "./liveness.js"
import { RenderStore } from "./store/render-store.js"

function createMockWs() {
  const ws = new EventEmitter() as EventEmitter & {
    ping: Mock
    terminate: Mock
  }
  ws.ping = vi.fn()
  ws.terminate = vi.fn()
  return ws as unknown as WebSocket & { ping: Mock; terminate: Mock }
}

function createMockWss() {
  return new EventEmitter() as unknown as WebSocketServer
}

describe("HeartbeatManager", () => {
  const testDir = join(tmpdir(), "wdyr-test-liveness")
  let store: RenderStore
  let heartbeat: HeartbeatManager

  const reason = {
    propsDifferences: [
      {
        pathString: "count",
        diffType: "deepEquals",
        prevValue: "1",
        nextValue: "2",
      },
    ],
    stateDifferences: false as const,
    hookDifferences: false as const,
  }

  function makeReport(name: string): RenderReport {
    return { displayName: name, reason }
  }

  beforeEach(() => {
    vi.useFakeTimers()
    rmSync(testDir, { recursive: true, force: true })
    mkdirSync(testDir, { recursive: true })
    store = new RenderStore(testDir)
  })

  afterEach(() => {
    heartbeat?.stop()
    vi.useRealTimers()
    rmSync(testDir, { recursive: true, force: true })
  })

  it("does not terminate a connection that responds to pings", () => {
    const wss = createMockWss()
    heartbeat = new HeartbeatManager(wss, store, 100)

    const ws = createMockWs()
    heartbeat.trackConnection(ws)

    // First tick: sets isAlive=false, sends ping
    vi.advanceTimersByTime(100)
    expect(ws.ping).toHaveBeenCalledTimes(1)

    // Client responds with pong
    ws.emit("pong")

    // Second tick: isAlive was reset to true, so sends ping again
    vi.advanceTimersByTime(100)
    expect(ws.terminate).not.toHaveBeenCalled()
    expect(ws.ping).toHaveBeenCalledTimes(2)
  })

  it("terminates a connection that misses a heartbeat", () => {
    const wss = createMockWss()
    heartbeat = new HeartbeatManager(wss, store, 100)

    const ws = createMockWs()
    heartbeat.trackConnection(ws)

    // First tick: sets isAlive=false, sends ping
    vi.advanceTimersByTime(100)

    // No pong response

    // Second tick: isAlive is still false → terminate
    vi.advanceTimersByTime(100)
    expect(ws.terminate).toHaveBeenCalledTimes(1)
  })

  it("clears render data when a dead connection had a projectId", () => {
    const wss = createMockWss()
    heartbeat = new HeartbeatManager(wss, store, 100)

    store.addRender(makeReport("App"), "http://localhost:3000")
    expect(store.getAllRenders("http://localhost:3000")).toHaveLength(1)

    const ws = createMockWs()
    heartbeat.trackConnection(ws)
    heartbeat.setProjectId(ws, "http://localhost:3000")

    // Miss two heartbeats → terminate
    vi.advanceTimersByTime(200)
    expect(ws.terminate).toHaveBeenCalled()
    expect(store.getAllRenders("http://localhost:3000")).toEqual([])
  })

  it("does not clear data when another connection shares the same projectId", () => {
    const wss = createMockWss()
    heartbeat = new HeartbeatManager(wss, store, 100)

    store.addRender(makeReport("App"), "http://localhost:3000")

    const ws1 = createMockWs()
    const ws2 = createMockWs()
    heartbeat.trackConnection(ws1)
    heartbeat.trackConnection(ws2)
    heartbeat.setProjectId(ws1, "http://localhost:3000")
    heartbeat.setProjectId(ws2, "http://localhost:3000")

    // First tick: both get ping
    vi.advanceTimersByTime(100)

    // Only ws2 responds
    ws2.emit("pong")

    // Second tick: ws1 is terminated, but ws2 still alive with same projectId
    vi.advanceTimersByTime(100)
    expect(ws1.terminate).toHaveBeenCalled()
    expect(ws2.terminate).not.toHaveBeenCalled()
    expect(store.getAllRenders("http://localhost:3000")).toHaveLength(1)
  })

  it("does not clear data for connections without a projectId", () => {
    const wss = createMockWss()
    heartbeat = new HeartbeatManager(wss, store, 100)

    store.addRender(makeReport("App"), "http://localhost:3000")

    const ws = createMockWs()
    heartbeat.trackConnection(ws)
    // No setProjectId call

    vi.advanceTimersByTime(200)
    expect(ws.terminate).toHaveBeenCalled()
    expect(store.getAllRenders("http://localhost:3000")).toHaveLength(1)
  })

  it("removes connection from tracking on close", () => {
    const wss = createMockWss()
    heartbeat = new HeartbeatManager(wss, store, 100)

    const ws = createMockWs()
    heartbeat.trackConnection(ws)

    // Client disconnects normally
    ws.emit("close")

    // Heartbeat tick should not try to ping or terminate the removed connection
    vi.advanceTimersByTime(100)
    expect(ws.ping).not.toHaveBeenCalled()
    expect(ws.terminate).not.toHaveBeenCalled()
  })

  it("stop() clears the interval", () => {
    const wss = createMockWss()
    heartbeat = new HeartbeatManager(wss, store, 100)

    const ws = createMockWs()
    heartbeat.trackConnection(ws)

    heartbeat.stop()

    vi.advanceTimersByTime(200)
    expect(ws.ping).not.toHaveBeenCalled()
  })
})
