/**
 * Hot-reloading Development Server for agentx-ui
 *
 * Watches agentx-node package changes and auto-rebuilds.
 * When dependencies change, restarts the server gracefully.
 */

import { spawn, ChildProcess } from "child_process";
import { watch } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths to watch
const AGENTX_SRC = resolve(__dirname, "../../agentx/src");
const AGENTX_DIST = resolve(__dirname, "../../agentx/dist");

let serverProcess: ChildProcess | null = null;
let isRebuilding = false;

/**
 * Start the dev server process
 */
function startServer() {
  console.log("🚀 Starting development server...\n");

  serverProcess = spawn("tsx", [resolve(__dirname, "dev-server.ts")], {
    stdio: "inherit",
    cwd: resolve(__dirname, ".."), // agentx-ui package root
  });

  serverProcess.on("exit", (code) => {
    if (code !== 0 && !isRebuilding) {
      console.error(`\n❌ Server exited with code ${code}`);
    }
  });
}

/**
 * Stop the dev server process
 */
function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!serverProcess) {
      resolve();
      return;
    }

    console.log("\n🛑 Stopping server...");

    serverProcess.once("exit", () => {
      serverProcess = null;
      resolve();
    });

    // Send SIGINT for graceful shutdown
    serverProcess.kill("SIGINT");

    // Force kill after 5s if not stopped
    setTimeout(() => {
      if (serverProcess) {
        console.log("⚠️  Force killing server...");
        serverProcess.kill("SIGKILL");
        serverProcess = null;
        resolve();
      }
    }, 5000);
  });
}

/**
 * Rebuild agentx package
 */
async function rebuildDependency(): Promise<boolean> {
  console.log("\n📦 Rebuilding agentx...");

  return new Promise((resolve) => {
    const buildProcess = spawn("pnpm", ["--filter", "@deepractice-ai/agentx", "build"], {
      stdio: "inherit",
      cwd: resolve(__dirname, "../../.."), // Go to monorepo root
    });

    buildProcess.on("exit", (code) => {
      if (code === 0) {
        console.log("✅ Rebuild successful\n");
        resolve(true);
      } else {
        console.error("❌ Rebuild failed\n");
        resolve(false);
      }
    });
  });
}

/**
 * Handle file changes and restart server
 */
async function handleChange(filename: string) {
  if (isRebuilding) {
    return;
  }

  console.log(`\n📝 File changed: ${filename}`);
  isRebuilding = true;

  // Stop current server
  await stopServer();

  // Rebuild dependency
  const success = await rebuildDependency();

  if (success) {
    // Restart server
    startServer();
  } else {
    console.error("❌ Not restarting server due to build failure");
  }

  isRebuilding = false;
}

/**
 * Setup file watchers
 */
function setupWatchers() {
  console.log("👀 Watching for changes...");
  console.log(`   - ${AGENTX_SRC}`);

  const watcher = watch(AGENTX_SRC, { recursive: true }, (eventType, filename) => {
    if (filename && filename.endsWith(".ts")) {
      handleChange(filename);
    }
  });

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\n\n🛑 Shutting down watch mode...");
    watcher.close();
    await stopServer();
    console.log("✅ Stopped");
    process.exit(0);
  });
}

/**
 * Main entry point
 */
async function main() {
  console.log("🔥 Hot-reloading Development Server\n");

  // Initial server start
  startServer();

  // Setup file watching
  setupWatchers();

  console.log("\n💡 Tips:");
  console.log("   - Edit files in agentx/src to trigger rebuild");
  console.log("   - WebSocket clients will auto-reconnect");
  console.log("   - Press Ctrl+C to stop\n");
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
