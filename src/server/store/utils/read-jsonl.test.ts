import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { readJsonl } from "./read-jsonl.js"

describe("readJsonl", () => {
  const testDir = join(tmpdir(), "wdyr-test-read-jsonl")

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  it("returns empty array for non-existent file", () => {
    expect(readJsonl(join(testDir, "nope.jsonl"))).toEqual([])
  })

  it("parses JSONL lines", () => {
    const file = join(testDir, "test.jsonl")
    const line1 = JSON.stringify({
      projectId: "p1",
      displayName: "A",
      reason: {
        propsDifferences: false,
        stateDifferences: false,
        hookDifferences: false,
      },
    })
    const line2 = JSON.stringify({
      projectId: "p1",
      displayName: "B",
      reason: {
        propsDifferences: false,
        stateDifferences: false,
        hookDifferences: false,
      },
    })
    writeFileSync(file, `${line1}\n${line2}\n`)

    const results = readJsonl(file)
    expect(results).toHaveLength(2)
    expect(results[0].displayName).toBe("A")
    expect(results[1].displayName).toBe("B")
  })

  it("ignores empty lines", () => {
    const file = join(testDir, "empty-lines.jsonl")
    const line = JSON.stringify({
      projectId: "p1",
      displayName: "X",
      reason: {
        propsDifferences: false,
        stateDifferences: false,
        hookDifferences: false,
      },
    })
    writeFileSync(file, `\n${line}\n\n`)

    expect(readJsonl(file)).toHaveLength(1)
  })
})
