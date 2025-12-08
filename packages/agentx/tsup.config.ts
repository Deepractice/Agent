import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    browser: "src/browser.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  target: "es2020",
  // Bundle internal packages (private packages that won't be published)
  noExternal: ["@agentxjs/types", "@agentxjs/common", "@agentxjs/network"],
});
