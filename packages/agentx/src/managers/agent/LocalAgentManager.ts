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
  ErrorMessageEvent,
  DriverClass,
} from "@deepractice-ai/agentx-types";
import { AgentInstance, createAgentContext } from "@deepractice-ai/agentx-core";
import type { AgentEngine } from "@deepractice-ai/agentx-engine";
import type { ErrorManager } from "../error/ErrorManager";
import { createLogger } from "@deepractice-ai/agentx-logger";

const logger = createLogger("agentx/LocalAgentManager");

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
   * Create a new agent instance
   */
  create<TDriver extends DriverClass>(
    definition: AgentDefinition<TDriver>,
    config: Record<string, unknown>
  ): Agent {
    logger.debug("Creating agent", { definitionName: definition.name });

    // Create context
    const agentContext = createAgentContext(config);

    // Create agent instance
    const agent = new AgentInstance(definition, agentContext, this.engine);

    // Subscribe to error events for platform-level handling
    agent.on("error_message", (event: ErrorMessageEvent) => {
      this.errorManager.handle(agent.agentId, event.data.error, event);
    });

    // Register in container
    this.container.register(agent);

    logger.info("Agent created", {
      agentId: agent.agentId,
      definitionName: definition.name,
    });

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
      logger.debug("Destroying agent", { agentId });
      await agent.destroy();
      this.container.unregister(agentId);
      logger.info("Agent destroyed", { agentId });
    }
  }

  /**
   * Destroy all agents
   */
  async destroyAll(): Promise<void> {
    const agentIds = this.container.getAllIds();
    logger.debug("Destroying all agents", { count: agentIds.length });
    await Promise.all(agentIds.map((id) => this.destroy(id)));
    logger.info("All agents destroyed", { count: agentIds.length });
  }
}
