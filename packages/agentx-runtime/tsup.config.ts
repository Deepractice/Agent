import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  external: [
    "@deepractice-ai/agentx-types",
    "@deepractice-ai/agentx-agent",
    "@deepractice-ai/agentx-engine",
    "@deepractice-ai/agentx-logger",
  ],
});
