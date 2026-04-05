import { defineConfig } from "tsdown"

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: "esm",
  platform: "node",
  target: "node20",
  outDir: "dist",
  dts: true,
  outputOptions: { banner: "#!/usr/bin/env node" },
  hash: false,
  minify: true,
})
