/**
 * Development WebSocket Server for agentx-ui
 *
 * This server runs alongside Storybook for local UI development.
 * Uses the new AgentX Framework with automatic session management.
 */

import { createWebSocketServer, ClaudeAgent } from "@deepractice-ai/agentx-framework";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.test file in same directory
const envPath = resolve(__dirname, ".env.test");
config({ path: envPath });

async function startDevServer() {
  // Support both AGENT_API_KEY and ANTHROPIC_API_KEY
  const apiKey = process.env.AGENT_API_KEY || process.env.ANTHROPIC_API_KEY;
  const baseUrl = process.env.AGENT_BASE_URL;

  if (!apiKey) {
    console.error("❌ Error: API key is not set");
    console.log("\nPlease set your API key in one of these ways:");
    console.log("  1. Create .env.test file in agentx-node package");
    console.log("  2. export AGENT_API_KEY='your-api-key'");
    console.log("  3. export ANTHROPIC_API_KEY='your-api-key'");
    process.exit(1);
  }

  console.log("🚀 Starting AgentX Development Server...\n");
  console.log("📝 Configuration:");
  console.log(`   API Key: ${apiKey.substring(0, 10)}...`);
  if (baseUrl) {
    console.log(`   Base URL: ${baseUrl}`);
  }
  console.log();

  // Create WebSocket Server with automatic session management
  const server = createWebSocketServer({
    // Agent definition - ClaudeAgent will be instantiated for each connection
    agentDefinition: ClaudeAgent,

    // Agent config factory - called for each new connection
    createAgentConfig: () => ({
      apiKey,
      baseUrl,
      model: "claude-sonnet-4-20250514",
      systemPrompt: "You are a helpful AI assistant for UI development testing.",
    }),

    // Server configuration
    port: 5200,
    host: "0.0.0.0",
    path: "/ws",
  });

  console.log("✅ WebSocket Server Started");
  console.log(`   URL: ${server.getUrl()}\n`);
  console.log("💡 Ready for UI development!");
  console.log("   Run 'pnpm storybook' in another terminal\n");
  console.log("📦 Framework: AgentX Framework v2");
  console.log("   • Automatic session management (one Agent per connection)");
  console.log("   • Real-time event streaming");
  console.log("   • Full Claude SDK features\n");

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\n\n🛑 Shutting down...");
    await server.close();
    console.log("✅ Server stopped");
    process.exit(0);
  });
}

startDevServer().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});
