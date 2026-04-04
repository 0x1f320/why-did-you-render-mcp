import type {
  SafeHookDifference,
  SafeReasonForUpdate,
  UpdateInfo,
  WsMessage,
} from "../types.js"

const DEFAULT_WS_URL = "ws://localhost:4649"

function describeValue(value: unknown): string {
  if (value === null) return "null"
  if (value === undefined) return "undefined"
  if (typeof value === "function")
    return `function ${value.name || "anonymous"}`
  if (typeof value !== "object") return String(value)
  if (Array.isArray(value)) return `Array(${value.length})`
  const proto = Object.getPrototypeOf(value)
  const name = proto?.constructor?.name
  if (name && name !== "Object") return name
  return "Object"
}

function sanitizeDifferences(diffs: unknown): SafeHookDifference[] | false {
  if (!Array.isArray(diffs)) return false
  return diffs.map((diff) => ({
    pathString: diff.pathString,
    diffType: diff.diffType,
    prevValue: describeValue(diff.prevValue),
    nextValue: describeValue(diff.nextValue),
  }))
}

function sanitizeReason(reason: UpdateInfo["reason"]): SafeReasonForUpdate {
  return {
    propsDifferences: sanitizeDifferences(reason.propsDifferences),
    stateDifferences: sanitizeDifferences(reason.stateDifferences),
    hookDifferences: sanitizeDifferences(reason.hookDifferences),
  }
}

export interface ClientOptions {
  wsUrl?: string
  projectId?: string
}

export function buildOptions(opts?: ClientOptions) {
  const wsUrl = opts?.wsUrl ?? DEFAULT_WS_URL
  const projectId = opts?.projectId ?? globalThis.location?.origin ?? "default"
  let ws: WebSocket | null = null
  let queue: WsMessage[] = []

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
        payload: {
          displayName: info.displayName,
          reason: sanitizeReason(info.reason),
          hookName: info.hookName,
        },
      })
    },
  }
}
