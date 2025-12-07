import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
    },
  },
  root: ".",
  publicDir: "public",
  build: {
    outDir: "dist/public",
    emptyDirOnly: true,
    sourcemap: true,
  },
  server: {
    port: 5173,
    headers: {
      "Cache-Control": "no-store",
    },
    proxy: {
      "/agentx": {
        target: "http://localhost:5200",
        changeOrigin: true,
      },
      "/api": {
        target: "http://localhost:5200",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:5200",
        ws: true,
      },
    },
  },
});
