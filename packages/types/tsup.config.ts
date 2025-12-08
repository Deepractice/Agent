import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    agent: "src/agent/index.ts",
    "agent-internal": "src/agent/internal/index.ts",
    runtime: "src/runtime/index.ts",
    "runtime-internal": "src/runtime/internal/index.ts",
    event: "src/event/index.ts",
    common: "src/common/index.ts",
    agentx: "src/agentx/index.ts",
    network: "src/network/index.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  tsconfig: "./tsconfig.json",
});
