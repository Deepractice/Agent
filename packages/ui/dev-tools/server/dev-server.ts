/**
 * Development Server for @agentxjs/ui
 *
 * Simple WebSocket server for Storybook UI development.
 * Uses createAgentX in local mode with WebSocket server capability.
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { FileLoggerFactory } from "./FileLogger.js";

// Get __dirname equivalent in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.test file
const envPath = resolve(__dirname, ".env.test");
config({ path: envPath });

async function startDevServer() {
  // Support both AGENT_API_KEY and ANTHROPIC_API_KEY
  const apiKey = process.env.AGENT_API_KEY || process.env.ANTHROPIC_API_KEY;
  const baseUrl = process.env.AGENT_BASE_URL || process.env.ANTHROPIC_BASE_URL;
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

  if (!apiKey) {
    console.error("Error: API key is not set");
    console.log("\nPlease set your API key in one of these ways:");
    console.log("  1. Create .env.test file in dev-tools/server/");
    console.log("     ANTHROPIC_API_KEY=your-api-key");
    console.log("  2. export ANTHROPIC_API_KEY='your-api-key'");
    process.exit(1);
  }

  const PORT = 5200;
  const AGENTX_DIR = resolve(__dirname, "../../.agentx");
  const LOG_DIR = resolve(AGENTX_DIR, "logs");

  console.log("Starting AgentX Development Server...\n");
  console.log("Configuration:");
  console.log(`  API Key: ${apiKey.substring(0, 15)}...`);
  console.log(`  Model: ${model}`);
  if (baseUrl) {
    console.log(`  Base URL: ${baseUrl}`);
  }
  console.log(`  Port: ${PORT}`);
  console.log(`  AgentX Directory: ${AGENTX_DIR}`);
  console.log(`  Storage: SQLite (auto-configured at ${AGENTX_DIR}/data/agentx.db)`);
  console.log(`  Log Directory: ${LOG_DIR}`);
  console.log();

  // Import and create AgentX instance
  const { createAgentX } = await import("agentxjs");

  // Storage is auto-configured: SQLite at {agentxDir}/data/agentx.db
  const agentx = await createAgentX({
    llm: {
      apiKey,
      baseUrl,
      model,
    },
    logger: {
      level: "debug",
      factory: new FileLoggerFactory("debug", LOG_DIR),
    },
    agentxDir: AGENTX_DIR,
  });

  // Create default container for Studio (single-tenant mode)
  try {
    console.log("Creating default container...");
    await agentx.request("container_create_request", {
      containerId: "default",
    });
    console.log("✓ Default container created");
  } catch (error) {
    console.error("Failed to create default container:", error);
    process.exit(1);
  }

  // Start WebSocket server
  await agentx.listen(PORT);

  console.log(`\n✓ WebSocket server started on ws://localhost:${PORT}`);
  console.log(`\nReady for Storybook development!`);
  console.log(`\nUsage in browser:`);
  console.log(`  const agentx = await createAgentX({ server: "ws://localhost:${PORT}" });`);

  // Graceful shutdown
  const shutdown = async () => {
    console.log("\nShutting down...");
    await agentx.dispose();
    console.log("Server stopped");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startDevServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
