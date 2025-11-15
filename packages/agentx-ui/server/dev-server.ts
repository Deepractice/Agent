/**
 * Development WebSocket Server for agentx-ui
 *
 * This server runs alongside Storybook for local UI development.
 * Provides a real Claude Agent connection for testing components.
 */

import { createAgent, createWebSocketServer } from "@deepractice-ai/agentx-node";

async function startDevServer() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error("❌ Error: ANTHROPIC_API_KEY is not set");
    console.log("\nPlease set your API key:");
    console.log("  export ANTHROPIC_API_KEY='your-api-key'");
    process.exit(1);
  }

  console.log("🚀 Starting AgentX Development Server...\n");

  // Create Agent
  const agent = createAgent(
    {
      apiKey,
      model: "claude-sonnet-4-20250514",
      systemPrompt: "You are a helpful AI assistant for UI development testing.",
    },
    {
      enableLogging: true,
      prettyLogs: true,
      logLevel: "info",
    }
  );

  // Create WebSocket Server
  const wsServer = createWebSocketServer({
    agent,
    port: 5200,
    host: "0.0.0.0",
  });

  console.log("✅ WebSocket Server Started");
  console.log(`   URL: ${wsServer.getUrl()}\n`);
  console.log("📦 Agent Info:");
  console.log(`   ID: ${agent.id}`);
  console.log(`   Session: ${agent.sessionId}\n`);
  console.log("💡 Ready for UI development!");
  console.log("   Run 'pnpm storybook' in another terminal\n");

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\n\n🛑 Shutting down...");
    await wsServer.close();
    agent.destroy();
    console.log("✅ Server stopped");
    process.exit(0);
  });
}

startDevServer().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});
