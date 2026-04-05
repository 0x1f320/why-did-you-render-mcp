import { describe, expect, it } from "vitest"
import { sanitizeProjectId } from "./sanitize-project-id.js"

describe("sanitizeProjectId", () => {
  it("replaces colons and slashes with underscores", () => {
    expect(sanitizeProjectId("http://localhost:3000")).toBe(
      "http___localhost_3000",
    )
  })

  it("keeps alphanumeric, dots, hyphens, and underscores", () => {
    expect(sanitizeProjectId("my-project_v1.0")).toBe("my-project_v1.0")
  })

  it("handles empty string", () => {
    expect(sanitizeProjectId("")).toBe("")
  })

  it("replaces all special characters", () => {
    expect(sanitizeProjectId("https://example.com:8080/path?q=1")).toBe(
      "https___example.com_8080_path_q_1",
    )
  })
})
