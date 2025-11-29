/**
 * @deepractice-ai/agentx-claude
 *
 * Claude Driver for AgentX - Node.js only
 *
 * This package provides the ClaudeDriver which wraps @anthropic-ai/claude-agent-sdk.
 * Use with defineAgent() from @deepractice-ai/agentx to create Claude-powered agents.
 *
 * @example
 * ```typescript
 * import { defineAgent, createAgent } from "@deepractice-ai/agentx"
 * import { ClaudeDriver } from "@deepractice-ai/agentx-claude"
 *
 * const MyAgent = defineAgent({
 *   name: "Assistant",
 *   driver: ClaudeDriver,
 *   configSchema: {
 *     apiKey: { type: "string", required: true },
 *     model: { type: "string", default: "claude-sonnet-4-20250514" },
 *   },
 * })
 *
 * const agent = createAgent(MyAgent, { apiKey: process.env.ANTHROPIC_API_KEY })
 * ```
 *
 * @packageDocumentation
 */

// ==================== Driver ====================
export { ClaudeSDKDriver as ClaudeDriver } from "./drivers/ClaudeSDKDriver";
export type { ClaudeSDKOptions as ClaudeDriverConfig } from "./drivers/ClaudeSDKOptions";

// Legacy exports (deprecated, use ClaudeDriver instead)
export { ClaudeSDKDriver } from "./drivers/ClaudeSDKDriver";
export type { ClaudeSDKOptions as ClaudeSDKDriverConfig } from "./drivers/ClaudeSDKOptions";
