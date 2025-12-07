import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  // Bundle internal packages (private packages that won't be published)
  noExternal: ["@agentxjs/types", "@agentxjs/common", "@agentxjs/agent"],
});
