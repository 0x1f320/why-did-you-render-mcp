import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { store } from "../store/index.js"
import { textResult } from "./utils/text-result.js"

export function register(server: McpServer): void {
  server.registerTool(
    "compare_snapshots",
    {
      title: "Compare Snapshots",
      description:
        "Compares two saved render snapshots and shows per-component render count changes.",
      inputSchema: {
        before: z.string().describe("The name of the baseline snapshot."),
        after: z
          .string()
          .describe(
            "The name of the snapshot to compare against the baseline.",
          ),
      },
    },
    async ({ before, after }) => {
      const beforeSnap = store.getSnapshot(before)
      if (!beforeSnap) {
        return textResult(`Snapshot "${before}" not found.`)
      }

      const afterSnap = store.getSnapshot(after)
      if (!afterSnap) {
        return textResult(`Snapshot "${after}" not found.`)
      }

      const allProjects = new Set([
        ...Object.keys(beforeSnap.data),
        ...Object.keys(afterSnap.data),
      ])

      if (allProjects.size === 0) {
        return textResult("Both snapshots are empty.")
      }

      const lines: string[] = []
      let totalBefore = 0
      let totalAfter = 0
      let totalDurBefore = 0
      let totalDurAfter = 0
      let hasDuration = false

      for (const proj of [...allProjects].sort()) {
        lines.push(`[${proj}]`)
        const beforeComponents = beforeSnap.data[proj] ?? {}
        const afterComponents = afterSnap.data[proj] ?? {}

        const allComponents = new Set([
          ...Object.keys(beforeComponents),
          ...Object.keys(afterComponents),
        ])

        for (const comp of [...allComponents].sort()) {
          const bEntry = beforeComponents[comp]
          const aEntry = afterComponents[comp]
          const bCount = bEntry?.count ?? 0
          const aCount = aEntry?.count ?? 0
          totalBefore += bCount
          totalAfter += aCount

          let durStr = ""
          if (bEntry?.totalDuration != null || aEntry?.totalDuration != null) {
            hasDuration = true
            const bDur = bEntry?.totalDuration ?? 0
            const aDur = aEntry?.totalDuration ?? 0
            totalDurBefore += bDur
            totalDurAfter += aDur
            durStr = ` [${bDur.toFixed(1)}ms → ${aDur.toFixed(1)}ms]`
          }

          lines.push(
            `  ${comp}: ${bCount} → ${aCount} (${formatChange(bCount, aCount)})${durStr}`,
          )
        }
      }

      lines.push("")
      let totalLine = `Total: ${totalBefore} → ${totalAfter} (${formatChange(totalBefore, totalAfter)})`
      if (hasDuration) {
        totalLine += ` [${totalDurBefore.toFixed(1)}ms → ${totalDurAfter.toFixed(1)}ms]`
      }
      lines.push(totalLine)

      return textResult(
        `Snapshot comparison: "${before}" → "${after}"\n\n${lines.join("\n")}`,
      )
    },
  )
}

function formatChange(before: number, after: number): string {
  if (before === 0 && after === 0) return "no change"
  if (before === 0) return "new"
  if (after === 0) return "removed"
  if (before === after) return "no change"
  const pct = (((after - before) / before) * 100).toFixed(1)
  return `${Number(pct) > 0 ? "+" : ""}${pct}%`
}
