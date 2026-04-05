import type {
  SafeHookDifference,
  SafeValue,
} from "@why-did-you-render-mcp/types"
import xxhash from "xxhash-wasm"
import type { StoredRender } from "../types.js"

export const DICT_KEY = "@@dict"
const REF_PREFIX = "@@ref:"

export type ValueDict = Record<string, SafeValue>

let h64ToString: (input: string) => string

const ready = xxhash().then((api) => {
  h64ToString = api.h64ToString
})

export function ensureReady(): Promise<void> {
  return ready
}

export function hashValue(value: SafeValue): string {
  return h64ToString(JSON.stringify(value))
}

function shouldDehydrate(value: SafeValue): boolean {
  return typeof value === "object" && value !== null
}

function dehydrateDiffs(
  diffs: SafeHookDifference[] | false,
  dict: ValueDict,
): SafeHookDifference[] | false {
  if (!diffs) return false

  return diffs.map((d) => {
    let { prevValue, nextValue } = d

    if (shouldDehydrate(prevValue)) {
      const hash = hashValue(prevValue)
      dict[hash] ??= prevValue
      prevValue = `${REF_PREFIX}${hash}`
    }
    if (shouldDehydrate(nextValue)) {
      const hash = hashValue(nextValue)
      dict[hash] ??= nextValue
      nextValue = `${REF_PREFIX}${hash}`
    }

    return prevValue === d.prevValue && nextValue === d.nextValue
      ? d
      : { ...d, prevValue, nextValue }
  })
}

export function dehydrate(render: StoredRender, dict: ValueDict): StoredRender {
  const { propsDifferences, stateDifferences, hookDifferences } = render.reason
  const newProps = dehydrateDiffs(propsDifferences, dict)
  const newState = dehydrateDiffs(stateDifferences, dict)
  const newHooks = dehydrateDiffs(hookDifferences, dict)

  if (
    newProps === propsDifferences &&
    newState === stateDifferences &&
    newHooks === hookDifferences
  ) {
    return render
  }

  return {
    ...render,
    reason: {
      propsDifferences: newProps,
      stateDifferences: newState,
      hookDifferences: newHooks,
    },
  }
}

function hydrateDiffs(
  diffs: SafeHookDifference[] | false,
  dict: ValueDict,
): SafeHookDifference[] | false {
  if (!diffs) return false

  return diffs.map((d) => {
    let { prevValue, nextValue } = d

    if (typeof prevValue === "string" && prevValue.startsWith(REF_PREFIX)) {
      prevValue = dict[prevValue.slice(REF_PREFIX.length)] ?? prevValue
    }
    if (typeof nextValue === "string" && nextValue.startsWith(REF_PREFIX)) {
      nextValue = dict[nextValue.slice(REF_PREFIX.length)] ?? nextValue
    }

    return prevValue === d.prevValue && nextValue === d.nextValue
      ? d
      : { ...d, prevValue, nextValue }
  })
}

export function hydrate(render: StoredRender, dict: ValueDict): StoredRender {
  const { propsDifferences, stateDifferences, hookDifferences } = render.reason
  const newProps = hydrateDiffs(propsDifferences, dict)
  const newState = hydrateDiffs(stateDifferences, dict)
  const newHooks = hydrateDiffs(hookDifferences, dict)

  if (
    newProps === propsDifferences &&
    newState === stateDifferences &&
    newHooks === hookDifferences
  ) {
    return render
  }

  return {
    ...render,
    reason: {
      propsDifferences: newProps,
      stateDifferences: newState,
      hookDifferences: newHooks,
    },
  }
}
