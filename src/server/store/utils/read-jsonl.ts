import { existsSync, readFileSync } from "node:fs"
import type { StoredRender } from "../types.js"
import { DICT_KEY, type ValueDict, hydrate } from "./value-dict.js"

export function readJsonl(file: string): StoredRender[] {
  if (!existsSync(file)) return []

  const lines = readFileSync(file, "utf-8").split("\n").filter(Boolean)
  if (lines.length === 0) return []

  let dict: ValueDict | undefined
  let startIdx = 0

  const first = JSON.parse(lines[0])
  if (DICT_KEY in first) {
    dict = first[DICT_KEY]
    startIdx = 1
  }

  const renders = lines
    .slice(startIdx)
    .map((l) => JSON.parse(l) as StoredRender)
  if (!dict) return renders
  return renders.map((r) => hydrate(r, dict))
}
