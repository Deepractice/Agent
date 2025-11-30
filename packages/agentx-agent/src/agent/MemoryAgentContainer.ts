/**
 * MemoryAgentContainer - In-memory implementation of AgentContainer
 *
 * Interface definition is in @deepractice-ai/agentx-types.
 */

import type { Agent, AgentContainer } from "@deepractice-ai/agentx-types";

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
