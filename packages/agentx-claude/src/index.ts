/**
 * @deepractice-ai/agentx-claude
 *
 * Claude Driver for AgentX - Node.js only
 *
 * @example
 * ```typescript
 * import { defineAgent } from "@deepractice-ai/agentx-adk";
 * import { createAgentX } from "@deepractice-ai/agentx";
 * import { ClaudeDriver } from "@deepractice-ai/agentx-claude";
 *
 * const MyAgent = defineAgent({
 *   name: "Assistant",
 *   driver: ClaudeDriver,
 *   config: {
 *     model: "claude-sonnet-4-20250514",
 *   },
 * });
 *
 * const agentx = createAgentX();
 * const agent = agentx.agents.create(MyAgent, {
 *   apiKey: process.env.ANTHROPIC_API_KEY,
 * });
 * ```
 *
 * @packageDocumentation
 */

// ==================== Modern ADK-based Driver ====================
export { ClaudeDriver } from "./ClaudeDriver";
export { claudeSDKConfig as claudeConfig } from "./ClaudeConfig";

// ==================== Legacy (Backward Compatibility) ====================
export { ClaudeSDKDriver } from "./drivers/ClaudeSDKDriver";
