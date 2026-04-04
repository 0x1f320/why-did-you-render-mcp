import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import type { WdyrConfig } from "../../types.js"
import { store } from "../store/index.js"
import { resolveProject } from "./utils/resolve-project.js"
import { textResult } from "./utils/text-result.js"

function formatConfig(config: WdyrConfig): string[] {
  const lines: string[] = []

  if (config.include?.length) {
    lines.push("  include:")
    for (const pattern of config.include) {
      lines.push(`    - /${pattern}/`)
    }
  }

  if (config.exclude?.length) {
    lines.push("  exclude:")
    for (const pattern of config.exclude) {
      lines.push(`    - /${pattern}/`)
    }
  }

  if (config.trackAllPureComponents != null) {
    lines.push(`  trackAllPureComponents: ${config.trackAllPureComponents}`)
  }
  if (config.trackHooks != null) {
    lines.push(`  trackHooks: ${config.trackHooks}`)
  }
  if (config.trackExtraHooks?.length) {
    lines.push("  trackExtraHooks:")
    for (const hook of config.trackExtraHooks) {
      lines.push(`    - ${hook}`)
    }
  }
  if (config.logOnDifferentValues != null) {
    lines.push(`  logOnDifferentValues: ${config.logOnDifferentValues}`)
  }
  if (config.logOwnerReasons != null) {
    lines.push(`  logOwnerReasons: ${config.logOwnerReasons}`)
  }

  return lines
}

export function register(server: McpServer): void {
  server.registerTool(
    "get_tracked_components",
    {
      title: "Get Tracked Components",
      description:
        "Returns the why-did-you-render configuration for the connected project, including include/exclude filters and tracking options. Also shows components observed in render data. If multiple projects are active and no project is specified, the tool will ask you to disambiguate.",
      inputSchema: {
        project: z
          .string()
          .optional()
          .describe(
            "Project identifier (the browser's origin URL, e.g. http://localhost:3000). Omit to auto-detect.",
          ),
      },
    },
    async ({ project }) => {
      const resolved = resolveProject(project)
      if (resolved.error) return textResult(resolved.error)

      const configs = store.getWdyrConfig(resolved.projectId)
      const tracked = store.getTrackedComponents(resolved.projectId)

      const hasConfig = Object.keys(configs).length > 0
      const hasTracked = Object.keys(tracked).length > 0

      if (!hasConfig && !hasTracked) {
        return textResult(
          "No configuration or tracked components found. Make sure the browser is connected and triggering re-renders.",
        )
      }

      const lines: string[] = []
      const projects = new Set([
        ...Object.keys(configs),
        ...Object.keys(tracked),
      ])

      for (const proj of projects) {
        lines.push(`[${proj}]`)

        const config = configs[proj]
        if (config) {
          lines.push("Configuration:")
          const configLines = formatConfig(config)
          if (configLines.length > 0) {
            lines.push(...configLines)
          } else {
            lines.push("  (default options)")
          }
        }

        const t = tracked[proj]
        if (t?.observed.length) {
          lines.push("Observed in renders:")
          for (const name of t.observed) {
            lines.push(`  - ${name}`)
          }
        }
      }

      return textResult(lines.join("\n"))
    },
  )
}
