import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { registry, store } from "../store/index.js"
import { resolveProject } from "./utils/resolve-project.js"
import { textResult } from "./utils/text-result.js"

const MAX_TIMEOUT = 30_000
const DEFAULT_TIMEOUT = 10_000
const POLL_INTERVAL = 500

function formatReasons(reasons: {
  props: number
  state: number
  hooks: number
}): string {
  const parts: string[] = []
  if (reasons.props > 0) parts.push(`props: ${reasons.props}`)
  if (reasons.state > 0) parts.push(`state: ${reasons.state}`)
  if (reasons.hooks > 0) parts.push(`hooks: ${reasons.hooks}`)
  return parts.length > 0 ? ` — ${parts.join(", ")}` : ""
}

export function register(server: McpServer): void {
  server.registerTool(
    "wait_for_renders",
    {
      title: "Wait for Renders",
      description:
        "Waits for new renders to arrive after a code change. Call this after modifying code to wait for HMR to complete and measure the resulting re-renders. Returns a summary of new renders received during the wait period.",
      inputSchema: {
        project: z
          .string()
          .optional()
          .describe(
            "Project identifier (the browser's origin URL, e.g. http://localhost:3000). Omit to auto-detect.",
          ),
        timeout: z
          .number()
          .optional()
          .describe(
            "Maximum time to wait in milliseconds (default 10000, max 30000).",
          ),
      },
    },
    async ({ project, timeout }) => {
      const resolved = resolveProject(project)
      if (resolved.error) return textResult(resolved.error)

      const timeoutMs = Math.min(timeout ?? DEFAULT_TIMEOUT, MAX_TIMEOUT)
      const waitStart = Date.now()

      const result = await new Promise<string>((resolve) => {
        let hmrDetected = false

        function poll() {
          const elapsed = Date.now() - waitStart

          if (resolved.projectId) {
            const hmrTs = registry.getLastHmrTimestamp(resolved.projectId)
            if (hmrTs != null && hmrTs >= waitStart) {
              hmrDetected = true
            }
          }

          const renders = store.getRendersSince(waitStart, resolved.projectId)

          if (renders.length > 0) {
            const summary = buildSummary(renders)
            const elapsed = Date.now() - waitStart
            const waitTime = (elapsed / 1000).toFixed(1)
            const hmrNote = hmrDetected ? " after HMR update" : ""
            resolve(
              `Received ${renders.length} new render(s)${hmrNote} (waited ${waitTime}s):\n\n${summary}`,
            )
            return
          }

          if (elapsed >= timeoutMs) {
            const waitTime = (timeoutMs / 1000).toFixed(1)
            if (hmrDetected) {
              resolve(
                `Timed out after ${waitTime}s — HMR was detected but no new renders were received.`,
              )
            } else {
              resolve(
                [
                  `Timed out after ${waitTime}s — no new renders received.`,
                  "No HMR signal was detected. Verify that:",
                  "- The dev server is running with HMR enabled",
                  "- The browser tab is open and connected",
                ].join("\n"),
              )
            }
            return
          }

          setTimeout(poll, POLL_INTERVAL)
        }

        poll()
      })

      return textResult(result)
    },
  )
}

function buildSummary(
  renders: ReturnType<typeof store.getRendersSince>,
): string {
  const components: Record<
    string,
    { count: number; reasons: { props: number; state: number; hooks: number } }
  > = {}

  for (const r of renders) {
    components[r.displayName] ??= {
      count: 0,
      reasons: { props: 0, state: 0, hooks: 0 },
    }
    const entry = components[r.displayName]
    entry.count++
    if (Array.isArray(r.reason.propsDifferences)) entry.reasons.props++
    if (Array.isArray(r.reason.stateDifferences)) entry.reasons.state++
    if (Array.isArray(r.reason.hookDifferences)) entry.reasons.hooks++
  }

  const lines: string[] = []
  for (const [name, { count, reasons }] of Object.entries(components)) {
    lines.push(`  ${name}: ${count} re-render(s)${formatReasons(reasons)}`)
  }
  return lines.join("\n")
}
