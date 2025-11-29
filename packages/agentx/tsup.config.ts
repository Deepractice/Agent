import { defineConfig } from "tsup";
import path from "path";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "server/index": "src/server/index.ts",
    "server/adapters/index": "src/server/adapters/index.ts",
    "server/adapters/express": "src/server/adapters/express.ts",
    "server/adapters/hono": "src/server/adapters/hono.ts",
    "server/adapters/next": "src/server/adapters/next.ts",
    "client/index": "src/client/index.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  target: "es2020",
  esbuildOptions(options) {
    options.alias = {
      "~": path.resolve(__dirname, "./src"),
    };
  },
});
