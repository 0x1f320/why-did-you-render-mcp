import type { UpdateInfo, WsMessage } from "../types.js"
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
  let ws: WebSocket | null = null
  let queue: WsMessage[] = []
  let commitId = 0

  patchDevToolsHook(() => {
    commitId++
  })

  function connect() {
    ws = new WebSocket(wsUrl)

    ws.addEventListener("open", () => {
      for (const msg of queue) {
        ws?.send(JSON.stringify(msg))
      }
      queue = []
    })

    ws.addEventListener("close", () => {
      ws = null
      setTimeout(connect, 1000)
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
      queue.push(msg)
    }
  }

  return {
    notifier(info: UpdateInfo) {
      send({
        type: "render",
        projectId,
        commitId,
        payload: {
          displayName: info.displayName,
          reason: sanitizeReason(info.reason),
          hookName: info.hookName,
        },
      })
    },
  }
}
