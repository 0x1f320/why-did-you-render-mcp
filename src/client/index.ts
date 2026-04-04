import type { WhyDidYouRenderOptions } from "@welldone-software/why-did-you-render"
import { type Socket, io } from "socket.io-client"
import type {
  ClientToServerEvents,
  RenderReport,
  ServerToClientEvents,
  UpdateInfo,
  WdyrConfig,
} from "../types.js"
import { parseStack } from "./utils/parse-stack.js"
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

const DEFAULT_URL = "http://localhost:4649"

const PREFIX_STYLE = "color: #38bdf8; font-weight: bold"
const RESET_STYLE = "color: inherit; font-weight: normal"

function log(message: string) {
  console.log(`%c[WDYR MCP]%c ${message}`, PREFIX_STYLE, RESET_STYLE)
}

export interface ClientOptions extends WhyDidYouRenderOptions {
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

function serializeConfig(opts: ClientOptions): WdyrConfig {
  const config: WdyrConfig = {}
  if (opts.include) config.include = opts.include.map((r) => r.source)
  if (opts.exclude) config.exclude = opts.exclude.map((r) => r.source)
  if (opts.trackAllPureComponents != null)
    config.trackAllPureComponents = opts.trackAllPureComponents
  if (opts.trackHooks != null) config.trackHooks = opts.trackHooks
  if (opts.trackExtraHooks)
    config.trackExtraHooks = opts.trackExtraHooks.map(([, name]) => name)
  if (opts.logOnDifferentValues != null)
    config.logOnDifferentValues = opts.logOnDifferentValues
  if (opts.logOwnerReasons != null)
    config.logOwnerReasons = opts.logOwnerReasons
  return config
}

export function buildOptions(opts?: ClientOptions): WhyDidYouRenderOptions {
  const {
    wsUrl: _wsUrl,
    projectId: _projectId,
    notifier: userNotifier,
    ...wdyrOpts
  } = opts ?? {}
  const url = _wsUrl ?? DEFAULT_URL
  const projectId = _projectId ?? globalThis.location?.origin ?? "default"

  let commitId = 0

  patchDevToolsHook(() => {
    commitId++
  })

  const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(url, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    transports: ["websocket"],
  })

  socket.on("connect", () => {
    log(`Connected to ${url}`)

    if (opts) {
      socket.emit("config", serializeConfig(opts), projectId)
    }
  })

  socket.on("disconnect", () => {
    log("Disconnected, reconnecting...")
  })

  interface PendingItem {
    info: UpdateInfo
    error: Error
  }

  let pendingBatch: { commitId: number; items: PendingItem[] } | null = null
  let flushScheduled = false

  async function flushBatch() {
    flushScheduled = false
    if (!pendingBatch || pendingBatch.items.length === 0) return

    const batch = pendingBatch
    pendingBatch = null

    const reports = await Promise.all(
      batch.items.map(async ({ info, error }) => {
        const stackFrames = await parseStack(error)
        const report: RenderReport = {
          displayName: info.displayName,
          reason: sanitizeReason(info.reason),
          hookName: info.hookName,
          ...(stackFrames.length > 0 && { stackFrames }),
        }
        return report
      }),
    )

    socket.emit("render-batch", reports, projectId, batch.commitId)
  }

  return {
    ...wdyrOpts,
    notifier(info: UpdateInfo) {
      const error = new Error()

      if (pendingBatch && pendingBatch.commitId === commitId) {
        pendingBatch.items.push({ info, error })
      } else {
        if (pendingBatch) flushBatch()
        pendingBatch = { commitId, items: [{ info, error }] }
      }

      if (!flushScheduled) {
        flushScheduled = true
        queueMicrotask(flushBatch)
      }

      if (userNotifier) {
        userNotifier(info)
      }
    },
  }
}
