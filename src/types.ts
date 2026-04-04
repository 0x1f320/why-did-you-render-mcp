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

export interface RenderReport {
  displayName: string
  reason: SafeReasonForUpdate
  hookName?: string
}

export type WsMessage =
  | {
      type: "render"
      payload: RenderReport
      projectId?: string
      commitId?: number
    }
  | {
      type: "render-batch"
      payload: RenderReport[]
      projectId?: string
      commitId?: number
    }
