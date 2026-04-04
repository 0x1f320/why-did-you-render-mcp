import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { register as clearRenders } from "./clear-renders.js"
import { register as compareSnapshots } from "./compare-snapshots.js"
import { register as deleteSnapshot } from "./delete-snapshot.js"
import { register as getCommits } from "./get-commits.js"
import { register as getProjects } from "./get-projects.js"
import { register as getRenderSummary } from "./get-render-summary.js"
import { register as getRendersByCommit } from "./get-renders-by-commit.js"
import { register as getRenders } from "./get-renders.js"
import { register as getTrackedComponents } from "./get-tracked-components.js"
import { register as listSnapshots } from "./list-snapshots.js"
import { register as pauseRenders } from "./pause-renders.js"
import { register as resumeRenders } from "./resume-renders.js"
import { register as saveSnapshot } from "./save-snapshot.js"
import { register as waitForRenders } from "./wait-for-renders.js"

export function registerTools(server: McpServer): void {
  getRenders(server)
  getRenderSummary(server)
  getCommits(server)
  getRendersByCommit(server)
  getProjects(server)
  getTrackedComponents(server)
  clearRenders(server)
  pauseRenders(server)
  resumeRenders(server)
  saveSnapshot(server)
  listSnapshots(server)
  compareSnapshots(server)
  deleteSnapshot(server)
  waitForRenders(server)
}
