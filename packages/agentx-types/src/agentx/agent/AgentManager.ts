/**
 * AgentManager - Agent lifecycle management
 *
 * TypeScript API for agent operations (agentx.agents.*)
 *
 * @example
 * ```typescript
 * const agentx = createAgentX();
 *
 * // Define agent
 * const MyAgent = agentx.agents.define({
 *   name: "MyAssistant",
 *   driver: myDriver,
 * });
 *
 * // Create instance
 * const agent = agentx.agents.create(MyAgent, config);
 *
 * // Get / List / Destroy
 * agentx.agents.get(agentId);
 * agentx.agents.list();
 * await agentx.agents.destroy(agentId);
 * ```
 */

import type { Agent } from "~/agent/Agent";
import type { AgentDefinition } from "~/agent/AgentDefinition";
import type { AgentDriver } from "~/agent/AgentDriver";
import type { AgentPresenter } from "~/agent/AgentPresenter";

/**
 * Input for defining an agent
 */
export interface DefineAgentInput<TConfig = Record<string, unknown>> {
  name: string;
  description?: string;
  driver: AgentDriver<TConfig>;
  presenters?: AgentPresenter[];
}

/**
 * Agent lifecycle management interface
 */
export interface AgentManager {
  /**
   * Define an agent
   */
  define<TConfig extends Record<string, unknown>>(
    input: DefineAgentInput<TConfig>
  ): AgentDefinition<TConfig>;

  /**
   * Create a new agent instance
   */
  create<TConfig extends Record<string, unknown>>(
    definition: AgentDefinition<TConfig>,
    config: TConfig
  ): Agent;

  /**
   * Get an existing agent by ID
   */
  get(agentId: string): Agent | undefined;

  /**
   * Check if an agent exists
   */
  has(agentId: string): boolean;

  /**
   * List all agents
   */
  list(): Agent[];

  /**
   * Destroy an agent by ID
   */
  destroy(agentId: string): Promise<void>;

  /**
   * Destroy all agents
   */
  destroyAll(): Promise<void>;
}
