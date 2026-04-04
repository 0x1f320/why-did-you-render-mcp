import { defineConfig } from "tsdown"

export default defineConfig([
  {
    entry: { "server/index": "src/server/index.ts" },
    format: "esm",
    platform: "node",
    target: "node20",
    outDir: "dist",
    clean: false,
    dts: true,
    outputOptions: { banner: "#!/usr/bin/env node" },
    hash: false,
    minify: true,
  },
  {
    entry: { "client/index": "src/client/index.ts" },
    format: ["esm", "cjs"],
    platform: "browser",
    outDir: "dist",
    clean: false,
    dts: true,
    hash: false,
    minify: true,
  },
])
