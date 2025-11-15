import { defineConfig } from "vitest/config";
import { vitestCucumber } from "@deepracticex/vitest-cucumber/plugin";
import path from "node:path";

export default defineConfig({
  plugins: [
    vitestCucumber({
      features: ["dist/features/**/*.feature"],
      steps: "tests/steps",
    }),
  ],
  test: {
    globals: true,
    environment: "node",
    include: ["dist/features/**/*.feature"],
    exclude: ["**/node_modules/**", "**/cypress/**"],
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
      "@": path.resolve(__dirname, "../"),
    },
  },
});
