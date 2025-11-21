/**
 * createAgent - Functional-style agent creation
 *
 * Alternative to calling `.create()` method on DefinedAgent.
 * Provides a consistent functional API across the framework.
 *
 * @example
 * ```typescript
 * import { createAgent } from "@deepractice-ai/agentx-framework";
 * import { ClaudeAgent } from "@deepractice-ai/agentx-sdk-claude";
 *
 * // Functional style
 * const agent = createAgent(ClaudeAgent, {
 *   apiKey: "xxx",
 *   model: "claude-sonnet-4-5-20250929",
 *   sessionId: "my-session",
 * });
 *
 * // Method style (equivalent)
 * const agent2 = ClaudeAgent.create({
 *   apiKey: "xxx",
 *   model: "claude-sonnet-4-5-20250929",
 *   sessionId: "my-session",
 * });
 * ```
 */

import type { AgentService } from "@deepractice-ai/agentx-core";
import type { DefinedAgent } from "~/defineAgent";
import type { ConfigSchema, InferConfig } from "~/defineConfig";

/**
 * Create an agent instance from a defined agent
 *
 * @param definedAgent - The defined agent (from defineAgent)
 * @param config - Agent configuration
 * @returns AgentService instance
 */
export function createAgent<TConfig extends ConfigSchema = any>(
  definedAgent: DefinedAgent<TConfig>,
  config?: Partial<InferConfig<TConfig>>
): AgentService {
  return definedAgent.create(config);
}
