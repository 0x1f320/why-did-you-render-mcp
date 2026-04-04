import { store } from "../../store/index.js"

/**
 * Resolves the project to use. If a project is explicitly given, use it.
 * If only one project exists, auto-select it. If multiple exist, return
 * a message asking the agent to disambiguate.
 */
export function resolveProject(project: string | undefined): {
  projectId: string | undefined
  error?: string
} {
  if (project) return { projectId: project }

  const projects = store.getProjects()
  if (projects.length === 0) return { projectId: undefined }
  if (projects.length === 1) return { projectId: projects[0] }

  return {
    projectId: undefined,
    error: [
      "Multiple projects are recording render data. Ask the user which project they are working on (e.g. their dev server URL like http://localhost:3000).",
      "",
      "Active projects:",
      ...projects.map((p) => `- ${p}`),
    ].join("\n"),
  }
}
