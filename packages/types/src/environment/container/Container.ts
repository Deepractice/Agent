/**
 * Container - Runtime environment for Agent instances
 *
 * Container is a runtime isolation boundary where Agents live and work.
 * Like an organization or workspace that can host multiple Agents.
 *
 * In the Agent-as-System model:
 * - Agent = Individual (a system with internal neural events)
 * - Container = Organization/Space (environment where Agents operate)
 * - Session = Memory/Experience (belongs to Agent, persisted in environment)
 *
 * Container provides:
 * - Agent instance management (register, get, unregister)
 * - Runtime isolation between different containers
 * - Foundation for future multi-agent collaboration
 *
 * @example
 * ```typescript
 * // Create a container
 * const container = new MemoryContainer();
 *
 * // Register an agent
 * container.register(agent);
 *
 * // Get agent by ID
 * const agent = container.get(agentId);
 *
 * // List all agents
 * const allAgents = container.list();
 * ```
 */

import type { Agent } from "~/agent/Agent";

/**
 * Container interface for managing Agent instances at runtime
 */
export interface Container {
  /**
   * Register an agent instance in this container
   */
  register(agent: Agent): void;

  /**
   * Get an agent by ID
   */
  get(agentId: string): Agent | undefined;

  /**
   * Check if an agent exists in this container
   */
  has(agentId: string): boolean;

  /**
   * Unregister an agent from this container
   *
   * @returns true if agent was found and removed, false otherwise
   */
  unregister(agentId: string): boolean;

  /**
   * List all agents in this container
   */
  list(): Agent[];

  /**
   * Get all agent IDs in this container
   */
  listIds(): string[];

  /**
   * Get the number of agents in this container
   */
  count(): number;

  /**
   * Clear all agents from this container
   */
  clear(): void;
}
