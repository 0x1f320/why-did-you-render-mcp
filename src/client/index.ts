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
  interface ImportMeta {
    hot?: {
      on(event: string, cb: (...args: unknown[]) => void): void
      accept(): void
    }
  }
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

interface FiberDurations {
  [displayName: string]: number[]
}

// biome-ignore lint/suspicious/noExplicitAny: React Fiber internals are untyped
function collectFiberDurations(fiber: any, out: FiberDurations): void {
  if (fiber == null) return

  const duration: number | undefined = fiber.actualDuration
  if (typeof duration === "number" && duration > 0) {
    const name: string | undefined = fiber.type?.displayName ?? fiber.type?.name
    if (name) {
      if (!out[name]) out[name] = []
      out[name].push(duration)
    }
  }

  collectFiberDurations(fiber.child, out)
  collectFiberDurations(fiber.sibling, out)
}

function patchDevToolsHook(
  onCommit: (durations: FiberDurations) => void,
): void {
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
    const durations: FiberDurations = {}
    // args: [rendererID, fiberRoot, priorityLevel]
    // biome-ignore lint/suspicious/noExplicitAny: React Fiber internals are untyped
    const fiberRoot = args[1] as any
    if (fiberRoot?.current) {
      collectFiberDurations(fiberRoot.current, durations)
    }
    onCommit(durations)
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
  let commitDurations: FiberDurations = {}

  patchDevToolsHook((durations) => {
    commitId++
    commitDurations = durations
  })

  const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(url, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    transports: ["websocket"],
  })

  let paused = false

  socket.on("connect", () => {
    log(`Connected to ${url}`)

    if (opts) {
      socket.emit("config", serializeConfig(opts), projectId)
    }
  })

  socket.on("disconnect", () => {
    log("Disconnected, reconnecting...")
  })

  socket.on("pause", () => {
    paused = true
    log("Render collection paused")
  })

  socket.on("resume", () => {
    paused = false
    log("Render collection resumed")
  })

  try {
    if (import.meta.hot) {
      import.meta.hot.on("vite:afterUpdate", () => {
        socket.emit("hmr", projectId)
      })
    }
  } catch {}

  try {
    // biome-ignore lint/suspicious/noExplicitAny: Webpack HMR types are not available
    const m = typeof module !== "undefined" ? (module as any) : undefined
    if (m?.hot) {
      m.hot.accept()
      m.hot.status((status: string) => {
        if (status === "idle") {
          socket.emit("hmr", projectId)
        }
      })
    }
  } catch {}

  interface PendingItem {
    info: UpdateInfo
    error: Error
  }

  let pendingBatch: {
    commitId: number
    items: PendingItem[]
    durations: FiberDurations
  } | null = null
  let flushScheduled = false

  async function flushBatch() {
    flushScheduled = false
    if (!pendingBatch || pendingBatch.items.length === 0) return

    const batch = pendingBatch
    pendingBatch = null

    const durationCounters: Record<string, number> = {}

    const reports = await Promise.all(
      batch.items.map(async ({ info, error }) => {
        const stackFrames = await parseStack(error)

        const durations = batch.durations[info.displayName]
        const idx = durationCounters[info.displayName] ?? 0
        durationCounters[info.displayName] = idx + 1
        const actualDuration = durations?.[idx]

        const report: RenderReport = {
          displayName: info.displayName,
          reason: sanitizeReason(info.reason),
          hookName: info.hookName,
          ...(stackFrames.length > 0 && { stackFrames }),
          ...(typeof actualDuration === "number" && { actualDuration }),
        }
        return report
      }),
    )

    socket.emit("render-batch", reports, projectId, batch.commitId)
  }

  return {
    ...wdyrOpts,
    notifier(info: UpdateInfo) {
      if (paused) {
        if (userNotifier) userNotifier(info)
        return
      }

      const error = new Error()

      if (pendingBatch && pendingBatch.commitId === commitId) {
        pendingBatch.items.push({ info, error })
      } else {
        if (pendingBatch) flushBatch()
        pendingBatch = {
          commitId,
          items: [{ info, error }],
          durations: commitDurations,
        }
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
