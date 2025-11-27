/**
 * LocalAgentManager - Local mode agent lifecycle management
 *
 * Manages the creation, retrieval, and destruction of agents in local mode.
 * Automatically subscribes to agent errors for platform-level handling.
 */

import type {
  AgentManager as IAgentManager,
  Agent,
  AgentDefinition,
  AgentContainer,
  AgentContext,
  ErrorMessageEvent,
  DefineAgentInput,
} from "@deepractice-ai/agentx-types";
import { AgentInstance, createAgentContext } from "@deepractice-ai/agentx-core";
import type { AgentEngine } from "@deepractice-ai/agentx-engine";
import type { ErrorManager } from "../error/ErrorManager";

/**
 * Local agent lifecycle manager implementation
 */
export class LocalAgentManager implements IAgentManager {
  constructor(
    private readonly container: AgentContainer,
    private readonly engine: AgentEngine,
    private readonly errorManager: ErrorManager
  ) {}

  /**
   * Define an agent
   */
  define<TConfig extends Record<string, unknown>>(
    input: DefineAgentInput<TConfig>
  ): AgentDefinition<TConfig> {
    if (!input.name) {
      throw new Error("[AgentManager.define] name is required");
    }
    if (!input.driver) {
      throw new Error("[AgentManager.define] driver is required");
    }

    return Object.freeze({
      name: input.name,
      description: input.description,
      driver: input.driver,
      presenters: input.presenters,
    });
  }

  /**
   * Create a new agent instance
   */
  create<TConfig extends Record<string, unknown>>(
    definition: AgentDefinition<TConfig>,
    config: TConfig
  ): Agent {
    // Create context
    const agentContext: AgentContext<TConfig> = createAgentContext(config);

    // Create agent instance
    const agent = new AgentInstance(definition, agentContext, this.engine);

    // Subscribe to error events for platform-level handling
    agent.on("error_message", (event: ErrorMessageEvent) => {
      this.errorManager.handle(agent.agentId, event.data.error, event);
    });

    // Register in container
    this.container.register(agent);

    return agent;
  }

  /**
   * Get an existing agent by ID
   */
  get(agentId: string): Agent | undefined {
    return this.container.get(agentId);
  }

  /**
   * Check if an agent exists
   */
  has(agentId: string): boolean {
    return this.container.has(agentId);
  }

  /**
   * List all agents
   */
  list(): Agent[] {
    return this.container.getAllIds().map((id) => this.container.get(id)!);
  }

  /**
   * Destroy an agent by ID
   */
  async destroy(agentId: string): Promise<void> {
    const agent = this.container.get(agentId);
    if (agent) {
      await agent.destroy();
      this.container.unregister(agentId);
    }
  }

  /**
   * Destroy all agents
   */
  async destroyAll(): Promise<void> {
    const agentIds = this.container.getAllIds();
    await Promise.all(agentIds.map((id) => this.destroy(id)));
  }
}
