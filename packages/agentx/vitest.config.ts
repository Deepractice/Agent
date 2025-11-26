import { defineConfig } from "vitest/config";
import { vitestCucumber } from "@deepracticex/vitest-cucumber/plugin";
import path from "node:path";

export default defineConfig({
  plugins: [
    vitestCucumber({
      features: ["features/**/*.feature"],
      steps: "tests/steps",
    }),
  ],
  test: {
    globals: true,
    environment: "node",
    include: ["features/**/*.feature", "tests/**/*.test.ts"],
    exclude: ["**/node_modules/**"],
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 30000,
    reporters: ["default", "html", "json"],
    outputFile: {
      html: "./test-results/index.html",
      json: "./test-results/results.json",
    },
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
      "@": path.resolve(__dirname, "../"),
    },
  },
});
