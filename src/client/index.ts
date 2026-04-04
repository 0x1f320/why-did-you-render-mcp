import type { RenderReport, UpdateInfo, WsMessage } from "../types.js"
import { sanitizeReason } from "./utils/sanitize-reason.js"

interface DevToolsHook {
  supportsFiber: boolean
  inject(...args: unknown[]): void
  onCommitFiberRoot(...args: unknown[]): void
  onCommitFiberUnmount(...args: unknown[]): void
}

declare global {
  var __REACT_DEVTOOLS_GLOBAL_HOOK__: DevToolsHook | undefined
}

const DEFAULT_WS_URL = "ws://localhost:4649"

export interface ClientOptions {
  wsUrl?: string
  projectId?: string
}

function patchDevToolsHook(onCommit: () => void): void {
  if (!globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      supportsFiber: true,
      inject() {},
      onCommitFiberRoot() {},
      onCommitFiberUnmount() {},
    }
  }

  const hook = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__
  const original = hook.onCommitFiberRoot.bind(hook)
  hook.onCommitFiberRoot = (...args: unknown[]) => {
    onCommit()
    return original(...args)
  }
}

export function buildOptions(opts?: ClientOptions) {
  const wsUrl = opts?.wsUrl ?? DEFAULT_WS_URL
  const projectId = opts?.projectId ?? globalThis.location?.origin ?? "default"
  const MAX_QUEUE_SIZE = 1000
  const BASE_DELAY = 1000
  const MAX_DELAY = 30000

  let ws: WebSocket | null = null
  let queue: WsMessage[] = []
  let commitId = 0
  let retryDelay = BASE_DELAY

  patchDevToolsHook(() => {
    commitId++
  })

  function connect() {
    ws = new WebSocket(wsUrl)

    ws.addEventListener("open", () => {
      retryDelay = BASE_DELAY
      for (const msg of queue) {
        ws?.send(JSON.stringify(msg))
      }
      queue = []
    })

    ws.addEventListener("close", () => {
      ws = null
      setTimeout(connect, retryDelay)
      retryDelay = Math.min(retryDelay * 2, MAX_DELAY)
    })

    ws.addEventListener("error", () => {
      ws?.close()
    })
  }

  connect()

  function send(msg: WsMessage) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg))
    } else {
      if (queue.length >= MAX_QUEUE_SIZE) {
        queue.shift()
      }
      queue.push(msg)
    }
  }

  let pendingBatch: { commitId: number; reports: RenderReport[] } | null = null
  let flushScheduled = false

  function flushBatch() {
    flushScheduled = false
    if (!pendingBatch || pendingBatch.reports.length === 0) return

    send({
      type: "render-batch",
      projectId,
      commitId: pendingBatch.commitId,
      payload: pendingBatch.reports,
    })
    pendingBatch = null
  }

  return {
    notifier(info: UpdateInfo) {
      const report: RenderReport = {
        displayName: info.displayName,
        reason: sanitizeReason(info.reason),
        hookName: info.hookName,
      }

      if (pendingBatch && pendingBatch.commitId === commitId) {
        pendingBatch.reports.push(report)
      } else {
        if (pendingBatch) flushBatch()
        pendingBatch = { commitId, reports: [report] }
      }

      if (!flushScheduled) {
        flushScheduled = true
        queueMicrotask(flushBatch)
      }
    },
  }
}
