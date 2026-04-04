import { defineConfig } from "tsup";

export default defineConfig([
	{
		entry: { "server/index": "src/server/index.ts" },
		format: "esm",
		platform: "node",
		target: "node20",
		outDir: "dist",
		dts: true,
		banner: { js: "#!/usr/bin/env node" },
	},
	{
		entry: { "client/index": "src/client/index.ts" },
		format: "esm",
		platform: "browser",
		outDir: "dist",
		dts: true,
	},
]);
