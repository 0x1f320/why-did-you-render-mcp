export function sanitizeProjectId(projectId: string): string {
	return projectId.replaceAll(/[^a-zA-Z0-9_.-]/g, "_");
}
