import { defineConfig } from "tsdown"

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm", "cjs"],
  platform: "browser",
  outDir: "dist",
  dts: true,
  hash: false,
  minify: true,
})
