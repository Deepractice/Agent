import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "server/index": "src/server/index.ts",
    "cli/index": "src/cli/index.ts",
  },
  format: ["esm"],
  dts: false,
  sourcemap: true,
  clean: false, // Don't clean, vite builds to same dist folder
  outDir: "dist",
  target: "node20",
  platform: "node",
  external: [
    // Don't bundle workspace packages
    "@deepractice-ai/agentx",
    "@deepractice-ai/agentx-node",
    "@deepractice-ai/agentx-types",
    // Don't bundle Node.js dependencies (CJS compatibility)
    "dotenv",
    "commander",
  ],
  esbuildOptions(options) {
    options.alias = {
      "~": "./src",
    };
  },
});
