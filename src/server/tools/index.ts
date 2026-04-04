import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { register as clearRenders } from "./clear-renders.js"
import { register as getCommits } from "./get-commits.js"
import { register as getProjects } from "./get-projects.js"
import { register as getRenderSummary } from "./get-render-summary.js"
import { register as getRendersByCommit } from "./get-renders-by-commit.js"
import { register as getUnnecessaryRenders } from "./get-unnecessary-renders.js"

export function registerTools(server: McpServer): void {
  getUnnecessaryRenders(server)
  getRenderSummary(server)
  getCommits(server)
  getRendersByCommit(server)
  getProjects(server)
  clearRenders(server)
}
