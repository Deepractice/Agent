/**
 * Agent SDK singleton instance
 * Manages Claude agent lifecycle and sessions
 */
import { createAgent } from "@deepractice-ai/agent-sdk";
import { logger } from "./utils/logger.js";
import { config } from "./index.js";

let agentInstance = null;

/**
 * Get or create Agent singleton
 */
export async function getAgent() {
  if (!agentInstance) {
    const projectPath = config().projectPath;

    if (!projectPath) {
      throw new Error("PROJECT_PATH not configured");
    }

    logger.info("🤖 Creating Agent instance");
    logger.info(`   Workspace: ${projectPath}`);

    agentInstance = createAgent({
      workspace: projectPath,
      model: "claude-sonnet-4",
      mcpServers: {
        promptx: {
          command: "promptx",
          args: ["mcp-server"],
          env: {
            // Inherit environment variables
            ...process.env,
          },
        },
      },
    });

    logger.info("🔥 Initializing Agent (loading historical sessions)...");
    await agentInstance.initialize();

    const status = agentInstance.getStatus();
    logger.info("✅ Agent initialized");
    logger.info(`   Active sessions: ${status.activeSessions}`);
  }

  return agentInstance;
}

/**
 * Destroy Agent instance (for shutdown)
 */
export function destroyAgent() {
  if (agentInstance) {
    logger.info("🛑 Destroying Agent instance");
    agentInstance.destroy();
    agentInstance = null;
  }
}
