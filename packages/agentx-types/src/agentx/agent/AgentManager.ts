/**
 * AgentManager - Agent lifecycle management (Runtime API)
 *
 * "Define Once, Run Anywhere"
 *
 * TypeScript API for runtime agent operations (agentx.agents.*)
 *
 * @example
 * ```typescript
 * import { defineAgent } from "@deepractice-ai/agentx";
 * import { createAgentX } from "@deepractice-ai/agentx";
 * import { runtime } from "@deepractice-ai/agentx-node";
 *
 * // Define agent (development time)
 * const MyAgent = defineAgent({
 *   name: "Translator",
 *   systemPrompt: "You are a translator",
 * });
 *
 * // Create instance (runtime)
 * const agentx = createAgentX(runtime);
 * const agent = agentx.agents.create(MyAgent);  // No config needed!
 *
 * // Get / List / Destroy
 * agentx.agents.get(agentId);
 * agentx.agents.list();
 * await agentx.agents.destroy(agentId);
 * ```
 */

import type { Agent } from "~/agent/Agent";
import type { AgentDefinition } from "~/agent/AgentDefinition";
import type { AgentConfig } from "~/agent/AgentConfig";

/**
 * Agent lifecycle management interface (Runtime only)
 */
export interface AgentManager {
  /**
   * Create a new agent instance from definition
   *
   * @param definition - Agent definition (business config)
   * @param config - Agent config (instance overrides, currently unused)
   */
  create(definition: AgentDefinition, config?: AgentConfig): Agent;

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
