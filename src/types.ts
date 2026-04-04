import type { UpdateInfo } from "@welldone-software/why-did-you-render"

export type { UpdateInfo } from "@welldone-software/why-did-you-render"

export interface SafeHookDifference {
  pathString: string
  diffType: string
  prevValue: string
  nextValue: string
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

export type WsMessage = {
  type: "render"
  payload: RenderReport
  projectId?: string
}
