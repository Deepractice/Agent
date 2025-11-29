/**
 * AgentManager - Agent lifecycle management (Runtime API)
 *
 * TypeScript API for runtime agent operations (agentx.agents.*)
 *
 * Note: Agent definition is done via defineAgent from @deepractice-ai/agentx-adk
 *
 * @example
 * ```typescript
 * import { defineAgent } from "@deepractice-ai/agentx-adk";
 * import { createAgentX } from "@deepractice-ai/agentx";
 *
 * // Define agent (development time)
 * const MyAgent = defineAgent({
 *   name: "MyAssistant",
 *   driver: myDriver,
 * });
 *
 * // Create instance (runtime)
 * const agentx = createAgentX();
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
import type { DriverClass } from "~/agent/AgentDriver";

/**
 * Agent lifecycle management interface (Runtime only)
 */
export interface AgentManager {
  /**
   * Create a new agent instance from definition
   */
  create<TDriver extends DriverClass>(
    definition: AgentDefinition<TDriver>,
    config: Record<string, unknown>
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
