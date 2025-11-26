/**
 * @deepractice-ai/agentx
 *
 * Define, Run, Scale AI Agents - The Open Source Agent Platform
 *
 * @example
 * ```typescript
 * import { agentx, defineAgent } from "@deepractice-ai/agentx";
 *
 * // Define an agent
 * const MyAgent = defineAgent({
 *   name: "MyAssistant",
 *   driver: myDriver,
 *   configSchema: {
 *     apiKey: { type: "string", required: true },
 *   },
 * });
 *
 * // Create and use (via default instance)
 * const agent = agentx.createAgent(MyAgent, { apiKey: "xxx" });
 * agent.on((event) => console.log(event));
 * await agent.receive("Hello!");
 *
 * // Or use convenience functions
 * const agent2 = createAgent(MyAgent, { apiKey: "xxx" });
 * ```
 *
 * @packageDocumentation
 */

import type { AgentX, Agent, AgentDefinition } from "@deepractice-ai/agentx-types";
import { createAgentX } from "./AgentXImpl";

// ===== Default AgentX Instance =====

/**
 * Default AgentX instance (global singleton)
 *
 * Use this for simple scenarios. For advanced use cases
 * (custom container, multiple instances), use createAgentX().
 *
 * @example
 * ```typescript
 * import { agentx } from "@deepractice-ai/agentx";
 *
 * const agent = agentx.createAgent(MyAgent, config);
 * agentx.getAgent(agentId);
 * agentx.destroyAgent(agentId);
 * ```
 */
export const agentx: AgentX = createAgentX();

// ===== Convenience Functions =====
// These use the default agentx instance

/**
 * Create a new agent (using default agentx instance)
 *
 * @example
 * ```typescript
 * const agent = createAgent(MyAgent, { apiKey: "xxx" });
 * ```
 */
export function createAgent<TConfig extends Record<string, unknown>>(
  definition: AgentDefinition<TConfig>,
  config: TConfig
): Agent {
  return agentx.createAgent(definition, config);
}

/**
 * Get an existing agent by ID (using default agentx instance)
 */
export function getAgent(agentId: string): Agent | undefined {
  return agentx.getAgent(agentId);
}

/**
 * Check if an agent exists (using default agentx instance)
 */
export function hasAgent(agentId: string): boolean {
  return agentx.hasAgent(agentId);
}

/**
 * Destroy an agent by ID (using default agentx instance)
 */
export function destroyAgent(agentId: string): Promise<void> {
  return agentx.destroyAgent(agentId);
}

/**
 * Destroy all agents (using default agentx instance)
 */
export function destroyAll(): Promise<void> {
  return agentx.destroyAll();
}

// ===== Advanced: Custom AgentX Instance =====

export { createAgentX } from "./AgentXImpl";

// ===== Define API =====

export { defineAgent, type DefineAgentOptions, type DefinedAgent } from "./defineAgent";

// ===== Config Schema =====

export {
  type ConfigSchema,
  type FieldDefinition,
  type FieldType,
  type InferConfig,
  validateConfig,
  applyDefaults,
  processConfig,
  ConfigValidationError,
} from "./ConfigSchema";

// ===== Re-export Types from @deepractice-ai/agentx-types =====

export type {
  // AgentX platform
  AgentX,
  AgentXOptions,
  // Agent contracts
  Agent,
  AgentDriver,
  AgentPresenter,
  AgentDefinition,
  AgentContainer,
  AgentContext,
  AgentContextBase,
  AgentOutput,
  AgentLifecycle,
  AgentEventHandler,
  AgentEventType,
  Unsubscribe,
} from "@deepractice-ai/agentx-types";
