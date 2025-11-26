/**
 * AgentX - Application context interface
 *
 * Like Express app or Vue app, AgentX is the central context
 * for managing agents in your application.
 *
 * @example
 * ```typescript
 * // Simple: use default instance
 * import { agentx } from "@deepractice-ai/agentx";
 * agentx.createAgent(MyAgent, { apiKey: "..." });
 *
 * // Advanced: create custom instance
 * import { createAgentX } from "@deepractice-ai/agentx";
 * const custom = createAgentX({ container: myContainer });
 * custom.createAgent(MyAgent, { apiKey: "..." });
 * ```
 */

import type { Agent } from "~/agent/Agent";
import type { AgentDefinition } from "~/agent/AgentDefinition";
import type { AgentContainer } from "~/agent/AgentContainer";

/**
 * AgentX configuration options
 */
export interface AgentXOptions {
  /**
   * Custom container for agent management
   * Default: MemoryAgentContainer
   */
  container?: AgentContainer;
}

/**
 * AgentX - Application context for agent management
 *
 * Provides:
 * - createAgent(): Create new agent instance
 * - getAgent(): Get existing agent by ID
 * - hasAgent(): Check if agent exists
 * - destroyAgent(): Destroy agent by ID
 * - destroyAll(): Destroy all agents
 */
export interface AgentX {
  /**
   * The container managing agent instances
   */
  readonly container: AgentContainer;

  /**
   * Create a new agent instance
   *
   * @param definition - Agent definition (from defineAgent)
   * @param config - Configuration matching definition's configSchema
   * @returns Created agent instance
   */
  createAgent<TConfig extends Record<string, unknown>>(
    definition: AgentDefinition<TConfig>,
    config: TConfig
  ): Agent;

  /**
   * Get an existing agent by ID
   *
   * @param agentId - The agent ID
   * @returns Agent instance or undefined
   */
  getAgent(agentId: string): Agent | undefined;

  /**
   * Check if an agent exists
   *
   * @param agentId - The agent ID
   * @returns true if agent exists
   */
  hasAgent(agentId: string): boolean;

  /**
   * Destroy an agent by ID
   *
   * @param agentId - The agent ID
   * @returns Promise that resolves when destroyed
   */
  destroyAgent(agentId: string): Promise<void>;

  /**
   * Destroy all agents
   *
   * @returns Promise that resolves when all destroyed
   */
  destroyAll(): Promise<void>;
}
