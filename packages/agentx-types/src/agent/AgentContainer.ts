/**
 * AgentContainer - Runtime instance container interface
 *
 * Like Docker Container or Spring's ApplicationContext,
 * manages Agent instances in memory at runtime.
 *
 * NOT for persistence - just runtime management.
 * Implementation is in core (MemoryAgentContainer).
 */

import type { Agent } from "./Agent";

/**
 * AgentContainer interface
 */
export interface AgentContainer {
  /**
   * Register an agent instance
   */
  register(agent: Agent): void;

  /**
   * Get agent by ID
   */
  get(agentId: string): Agent | undefined;

  /**
   * Check if agent exists
   */
  has(agentId: string): boolean;

  /**
   * Unregister agent by ID
   */
  unregister(agentId: string): boolean;

  /**
   * Get all agent IDs
   */
  getAllIds(): string[];

  /**
   * Get total count
   */
  count(): number;

  /**
   * Clear all agents
   */
  clear(): void;
}
