import type { WdyrConfig } from "../../types.js"

export class ProjectRegistry {
  private readonly trackedComponents = new Map<string, string[]>()
  private readonly wdyrConfigs = new Map<string, WdyrConfig>()
  private readonly hmrTimestamps = new Map<string, number>()

  setTrackedComponents(components: string[], projectId: string): void {
    this.trackedComponents.set(projectId, components)
  }

  getTrackedComponents(projectId: string): string[] {
    return this.trackedComponents.get(projectId) ?? []
  }

  setWdyrConfig(config: WdyrConfig, projectId: string): void {
    this.wdyrConfigs.set(projectId, config)
  }

  getWdyrConfig(projectId?: string): Record<string, WdyrConfig> {
    const result: Record<string, WdyrConfig> = {}

    if (projectId) {
      const config = this.wdyrConfigs.get(projectId)
      if (config) result[projectId] = config
    } else {
      for (const [proj, config] of this.wdyrConfigs) {
        result[proj] = config
      }
    }

    return result
  }

  recordHmr(projectId: string): void {
    this.hmrTimestamps.set(projectId, Date.now())
  }

  getLastHmrTimestamp(projectId: string): number | null {
    return this.hmrTimestamps.get(projectId) ?? null
  }
}
