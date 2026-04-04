import { beforeEach, describe, expect, it } from "vitest"
import { ProjectRegistry } from "./project-registry.js"

describe("ProjectRegistry", () => {
  let registry: ProjectRegistry

  beforeEach(() => {
    registry = new ProjectRegistry()
  })

  describe("tracked components", () => {
    it("stores and retrieves tracked components", () => {
      registry.setTrackedComponents(
        ["App", "Header", "Footer"],
        "http://localhost:3000",
      )

      expect(registry.getTrackedComponents("http://localhost:3000")).toEqual([
        "App",
        "Header",
        "Footer",
      ])
    })

    it("returns empty array for unknown project", () => {
      expect(registry.getTrackedComponents("http://localhost:3000")).toEqual([])
    })

    it("overwrites previous tracked components", () => {
      registry.setTrackedComponents(["App"], "http://localhost:3000")
      registry.setTrackedComponents(["Header"], "http://localhost:3000")

      expect(registry.getTrackedComponents("http://localhost:3000")).toEqual([
        "Header",
      ])
    })

    it("keeps projects isolated", () => {
      registry.setTrackedComponents(["App"], "http://localhost:3000")
      registry.setTrackedComponents(["Dashboard"], "http://localhost:5173")

      expect(registry.getTrackedComponents("http://localhost:3000")).toEqual([
        "App",
      ])
      expect(registry.getTrackedComponents("http://localhost:5173")).toEqual([
        "Dashboard",
      ])
    })
  })

  describe("wdyr config", () => {
    it("stores and retrieves config for a project", () => {
      const config = { include: ["App.*"], trackHooks: true }
      registry.setWdyrConfig(config, "http://localhost:3000")

      const result = registry.getWdyrConfig("http://localhost:3000")
      expect(result).toEqual({ "http://localhost:3000": config })
    })

    it("returns empty object for unknown project", () => {
      expect(registry.getWdyrConfig("http://localhost:9999")).toEqual({})
    })

    it("returns all configs when no project specified", () => {
      const config1 = { include: ["App.*"] }
      const config2 = { exclude: ["Internal.*"] }
      registry.setWdyrConfig(config1, "http://localhost:3000")
      registry.setWdyrConfig(config2, "http://localhost:5173")

      const result = registry.getWdyrConfig()
      expect(result).toEqual({
        "http://localhost:3000": config1,
        "http://localhost:5173": config2,
      })
    })

    it("overwrites previous config", () => {
      registry.setWdyrConfig({ trackHooks: true }, "http://localhost:3000")
      registry.setWdyrConfig({ trackHooks: false }, "http://localhost:3000")

      const result = registry.getWdyrConfig("http://localhost:3000")
      expect(result["http://localhost:3000"].trackHooks).toBe(false)
    })
  })

  describe("HMR timestamps", () => {
    it("records and retrieves HMR timestamp", () => {
      const before = Date.now()
      registry.recordHmr("http://localhost:3000")
      const after = Date.now()

      const ts = registry.getLastHmrTimestamp("http://localhost:3000")
      expect(ts).toBeGreaterThanOrEqual(before)
      expect(ts).toBeLessThanOrEqual(after)
    })

    it("returns null for unknown project", () => {
      expect(registry.getLastHmrTimestamp("http://localhost:3000")).toBeNull()
    })

    it("overwrites previous timestamp", () => {
      registry.recordHmr("http://localhost:3000")
      const first = registry.getLastHmrTimestamp("http://localhost:3000")

      registry.recordHmr("http://localhost:3000")
      const second = registry.getLastHmrTimestamp("http://localhost:3000")

      expect(second).toBeGreaterThanOrEqual(first ?? 0)
    })

    it("keeps projects isolated", () => {
      registry.recordHmr("http://localhost:3000")

      expect(registry.getLastHmrTimestamp("http://localhost:5173")).toBeNull()
      expect(
        registry.getLastHmrTimestamp("http://localhost:3000"),
      ).not.toBeNull()
    })
  })
})
