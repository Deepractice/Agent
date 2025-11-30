/**
 * AgentX Node Runtime
 *
 * "Define Once, Run Anywhere"
 *
 * Node.js Runtime for AgentX with Claude driver.
 * RuntimeConfig collected from environment variables.
 *
 * Required env vars:
 * - ANTHROPIC_API_KEY (required)
 * - ANTHROPIC_BASE_URL (optional)
 * - CLAUDE_MODEL (optional, defaults to claude-sonnet-4-20250514)
 *
 * @example
 * ```typescript
 * import { defineAgent, createAgentX } from "@deepractice-ai/agentx";
 * import { runtime } from "@deepractice-ai/agentx-node";
 *
 * const MyAgent = defineAgent({
 *   name: "Translator",
 *   systemPrompt: "You are a translator",
 * });
 *
 * const agentx = createAgentX(runtime);
 * const agent = agentx.agents.create(MyAgent);
 * ```
 *
 * @packageDocumentation
 */

// ==================== Runtime ====================
export { runtime, NodeRuntime } from "./NodeRuntime";

// ==================== Driver (for advanced use) ====================
export { createClaudeDriver } from "./ClaudeDriver";
export type { ClaudeDriverConfig } from "./ClaudeDriver";
