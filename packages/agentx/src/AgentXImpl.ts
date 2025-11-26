/**
 * AgentXImpl - Implementation of AgentX interface
 *
 * The central application context for agent management.
 * Like Express app or Vue app.
 */

import type {
  AgentX,
  AgentXOptions,
  Agent,
  AgentDefinition,
  AgentContainer,
  AgentContext,
} from "@deepractice-ai/agentx-types";
import {
  AgentInstance,
  MemoryAgentContainer,
  createAgentContext,
} from "@deepractice-ai/agentx-core";
import { AgentEngine } from "@deepractice-ai/agentx-engine";

/**
 * AgentX implementation
 */
export class AgentXImpl implements AgentX {
  private _container: AgentContainer;
  private _engine: AgentEngine;

  constructor(options: AgentXOptions = {}) {
    this._container = options.container ?? new MemoryAgentContainer();
    this._engine = new AgentEngine();
  }

  /**
   * The container managing agent instances
   */
  get container(): AgentContainer {
    return this._container;
  }

  /**
   * Create a new agent instance
   */
  createAgent<TConfig extends Record<string, unknown>>(
    definition: AgentDefinition<TConfig>,
    config: TConfig
  ): Agent {
    // Create context by merging internal fields with config
    const agentContext: AgentContext<TConfig> = createAgentContext(config);

    // Create agent instance
    const agent = new AgentInstance(definition, agentContext, this._engine);

    // Register in container
    this._container.register(agent);

    return agent;
  }

  /**
   * Get an existing agent by ID
   */
  getAgent(agentId: string): Agent | undefined {
    return this._container.get(agentId);
  }

  /**
   * Check if an agent exists
   */
  hasAgent(agentId: string): boolean {
    return this._container.has(agentId);
  }

  /**
   * Destroy an agent by ID
   */
  async destroyAgent(agentId: string): Promise<void> {
    const agent = this._container.get(agentId);
    if (agent) {
      await agent.destroy();
      this._container.unregister(agentId);
    }
  }

  /**
   * Destroy all agents
   */
  async destroyAll(): Promise<void> {
    const agentIds = this._container.getAllIds();
    await Promise.all(agentIds.map((id) => this.destroyAgent(id)));
  }
}

/**
 * Create a new AgentX instance
 *
 * @example
 * ```typescript
 * // Default instance
 * const agentx = createAgentX();
 *
 * // Custom container
 * const agentx = createAgentX({
 *   container: new DatabaseAgentContainer(postgres),
 * });
 * ```
 */
export function createAgentX(options: AgentXOptions = {}): AgentX {
  return new AgentXImpl(options);
}
