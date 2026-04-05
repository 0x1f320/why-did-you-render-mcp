import type { ComponentSummary, RenderWithProject } from "../types.js"

export function summarize(
  renders: RenderWithProject[],
): Record<string, Record<string, ComponentSummary>> {
  const summary: Record<string, Record<string, ComponentSummary>> = {}

  for (const r of renders) {
    summary[r.project] ??= {}
    const project = summary[r.project]
    project[r.displayName] ??= {
      count: 0,
      reasons: { props: 0, state: 0, hooks: 0 },
    }
    const entry = project[r.displayName]
    entry.count++
    if (Array.isArray(r.reason.propsDifferences)) entry.reasons.props++
    if (Array.isArray(r.reason.stateDifferences)) entry.reasons.state++
    if (Array.isArray(r.reason.hookDifferences)) entry.reasons.hooks++
    if (typeof r.actualDuration === "number") {
      entry.totalDuration = (entry.totalDuration ?? 0) + r.actualDuration
    }
  }

  return summary
}

export function summarizeByCommit(
  renders: RenderWithProject[],
): Record<string, Record<number, Record<string, ComponentSummary>>> {
  const summary: Record<
    string,
    Record<number, Record<string, ComponentSummary>>
  > = {}

  for (const r of renders) {
    if (r.commitId == null) continue
    summary[r.project] ??= {}
    summary[r.project][r.commitId] ??= {}
    const commit = summary[r.project][r.commitId]
    commit[r.displayName] ??= {
      count: 0,
      reasons: { props: 0, state: 0, hooks: 0 },
    }
    const entry = commit[r.displayName]
    entry.count++
    if (Array.isArray(r.reason.propsDifferences)) entry.reasons.props++
    if (Array.isArray(r.reason.stateDifferences)) entry.reasons.state++
    if (Array.isArray(r.reason.hookDifferences)) entry.reasons.hooks++
    if (typeof r.actualDuration === "number") {
      entry.totalDuration = (entry.totalDuration ?? 0) + r.actualDuration
    }
  }

  return summary
}
