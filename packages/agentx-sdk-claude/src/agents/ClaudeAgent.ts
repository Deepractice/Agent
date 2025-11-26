/**
 * ClaudeAgent
 *
 * Pre-configured Agent using Claude SDK Driver.
 *
 * @example
 * ```typescript
 * import { ClaudeAgent } from "@deepractice-ai/agentx/agents";
 *
 * const agent = ClaudeAgent.create({
 *   apiKey: process.env.ANTHROPIC_API_KEY,
 *   model: "claude-3-5-sonnet-20241022",
 * });
 *
 * await agent.initialize();
 * await agent.send("Hello!");
 * ```
 */

import { defineAgent, defineConfig } from "@deepractice-ai/agentx";
import { ClaudeSDKDriver } from "../drivers/ClaudeSDKDriver";

/**
 * ClaudeAgent - Pre-configured Claude SDK Agent
 */
export const ClaudeAgent = defineAgent({
  name: "Claude",
  driver: ClaudeSDKDriver,
  config: defineConfig({
    apiKey: { type: "string", required: true },
    model: { type: "string", default: "claude-3-5-sonnet-20241022" },
    baseUrl: { type: "string" },
    cwd: { type: "string" },
    systemPrompt: { type: "string" },
    maxTurns: { type: "number" },
    permissionMode: { type: "string" },
    mcpServers: { type: "object" },
    // Add other common config fields as needed
  }),
});
