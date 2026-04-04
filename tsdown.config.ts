import { defineConfig } from "tsdown"

export default defineConfig([
  {
    entry: { "server/index": "src/server/index.ts" },
    format: "esm",
    platform: "node",
    target: "node20",
    outDir: "dist",
    dts: true,
    outputOptions: { banner: "#!/usr/bin/env node" },
    hash: false,
  },
  {
    entry: { "client/index": "src/client/index.ts" },
    format: "esm",
    platform: "browser",
    outDir: "dist",
    dts: true,
    hash: false,
  },
])
