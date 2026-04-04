import type { UpdateInfo } from "@welldone-software/why-did-you-render"

export type { UpdateInfo } from "@welldone-software/why-did-you-render"

export interface FunctionValue {
  type: "function"
  name: string
}

export type SafeValue = string | FunctionValue

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
