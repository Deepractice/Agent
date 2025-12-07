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
    "@agentxjs/types",
    "@agentxjs/types/agent",
    "@agentxjs/types/runtime",
    "@agentxjs/common",
    "@agentxjs/engine",
  ],
});
