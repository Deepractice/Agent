/**
 * Development Server for @agentxjs/ui
 *
 * Simple WebSocket server for Storybook UI development.
 * Uses createAgentX in local mode with WebSocket server capability.
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

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

  if (!apiKey) {
    console.error("Error: API key is not set");
    console.log("\nPlease set your API key in one of these ways:");
    console.log("  1. Create .env.test file in dev-tools/server/");
    console.log("     ANTHROPIC_API_KEY=your-api-key");
    console.log("  2. export ANTHROPIC_API_KEY='your-api-key'");
    process.exit(1);
  }

  const PORT = 5200;

  console.log("Starting AgentX Development Server...\n");
  console.log("Configuration:");
  console.log(`  API Key: ${apiKey.substring(0, 15)}...`);
  if (baseUrl) {
    console.log(`  Base URL: ${baseUrl}`);
  }
  console.log(`  Port: ${PORT}`);
  console.log();

  // Import and create AgentX instance
  const { createAgentX } = await import("agentxjs");

  const agentx = await createAgentX({
    llm: {
      apiKey,
      baseUrl,
    },
  });

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
