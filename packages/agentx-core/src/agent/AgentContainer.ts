/**
 * AgentContainer - Runtime instance container
 *
 * Like Docker Container or Spring's ApplicationContext,
 * manages Agent instances in memory at runtime.
 *
 * NOT for persistence - just runtime management.
 * AgentRegistry will be used for AgentDefinition management in the future.
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

/**
 * In-memory implementation of AgentContainer
 */
export class MemoryAgentContainer implements AgentContainer {
  private readonly agents: Map<string, Agent> = new Map();

  register(agent: Agent): void {
    this.agents.set(agent.agentId, agent);
  }

  get(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  has(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  unregister(agentId: string): boolean {
    return this.agents.delete(agentId);
  }

  getAllIds(): string[] {
    return Array.from(this.agents.keys());
  }

  count(): number {
    return this.agents.size;
  }

  clear(): void {
    this.agents.clear();
  }
}
