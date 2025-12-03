/**
 * MemoryContainer - In-memory implementation of Container
 *
 * Simple Map-based container for managing Agent instances at runtime.
 */

import type { Agent, Container } from "@agentxjs/types";

/**
 * In-memory implementation of Container
 */
export class MemoryContainer implements Container {
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

  list(): Agent[] {
    return Array.from(this.agents.values());
  }

  listIds(): string[] {
    return Array.from(this.agents.keys());
  }

  count(): number {
    return this.agents.size;
  }

  clear(): void {
    this.agents.clear();
  }
}
