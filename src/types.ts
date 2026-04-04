import type { UpdateInfo } from "@welldone-software/why-did-you-render"

export type { UpdateInfo } from "@welldone-software/why-did-you-render"

export interface FunctionValue {
  type: "function"
  name: string
}

export interface ClassValue {
  type: "class"
  name: string
}

export interface DomValue {
  type: "dom"
  tagName: string
  attrs: { [key: string]: string }
}

export interface ErrorValue {
  type: "Error"
  name: string
  message: string
}

export interface MapValue {
  type: "Map"
  entries: { [key: string]: SafeValue }
}

export interface SetValue {
  type: "Set"
  values: SafeValue[]
}

export interface ReactNodeValue {
  type: "react-node"
  component: {
    name: string
    memo: boolean
    forwardRef: boolean
  }
  props: { [key: string]: SafeValue }
}

export type SafeValue =
  | string
  | number
  | boolean
  | null
  | FunctionValue
  | ClassValue
  | DomValue
  | ErrorValue
  | MapValue
  | SetValue
  | ReactNodeValue
  | SafeValue[]
  | { [key: string]: SafeValue }

export interface SafeHookDifference {
  pathString: string
  diffType: string
  prevValue: SafeValue
  nextValue: SafeValue
}

export interface SafeReasonForUpdate {
  propsDifferences: SafeHookDifference[] | false
  stateDifferences: SafeHookDifference[] | false
  hookDifferences: SafeHookDifference[] | false
}

export interface StackFrameLocation {
  path: string
  line: number
}

export interface StackFrame {
  type: "hook" | "component"
  name: string
  location: StackFrameLocation
}

export interface RenderReport {
  displayName: string
  reason: SafeReasonForUpdate
  hookName?: string
  stackFrames?: StackFrame[]
}

export interface WdyrConfig {
  include?: string[]
  exclude?: string[]
  trackAllPureComponents?: boolean
  trackHooks?: boolean
  trackExtraHooks?: string[]
  logOnDifferentValues?: boolean
  logOwnerReasons?: boolean
}

// socket.io typed event contract — shared between client and server

export interface ClientToServerEvents {
  render: (payload: RenderReport, projectId: string, commitId?: number) => void
  "render-batch": (
    payload: RenderReport[],
    projectId: string,
    commitId?: number,
  ) => void
  register: (components: string[], projectId: string) => void
  config: (config: WdyrConfig, projectId: string) => void
}

export interface ServerToClientEvents {
  pause: () => void
  resume: () => void
}

// biome-ignore lint/complexity/noBannedTypes: socket.io requires explicit empty interface for unused event maps
export type InterServerEvents = {}

export interface SocketData {
  projectId: string | null
}
