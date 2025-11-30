/**
 * AgentManager - Agent lifecycle management
 *
 * "Define Once, Run Anywhere"
 *
 * Manages the creation, retrieval, and destruction of agents.
 * Uses Runtime for infrastructure (container, sandbox, driver).
 *
 * - AgentDefinition: Business config (systemPrompt, etc.)
 * - AgentConfig: Instance overrides (currently empty)
 * - RuntimeConfig: Infrastructure (collected by Runtime from env)
 */

import type {
  AgentManager as IAgentManager,
  Agent,
  AgentDefinition,
  AgentConfig,
  Runtime,
  ErrorEvent,
  AgentContext,
} from "@deepractice-ai/agentx-types";
import { AgentInstance } from "@deepractice-ai/agentx-agent";
import type { AgentEngine } from "@deepractice-ai/agentx-engine";
import type { ErrorManager } from "../error/ErrorManager";
import { createLogger } from "@deepractice-ai/agentx-logger";

const logger = createLogger("agentx/AgentManager");

/**
 * Generate unique agent ID
 */
function generateAgentId(): string {
  return `agent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Agent lifecycle manager implementation
 *
 * Uses Runtime for:
 * - runtime.container: Agent registration/lookup
 * - runtime.createSandbox(): Resource isolation
 * - runtime.createDriver(): Event source creation (merges AgentDefinition + RuntimeConfig)
 */
export class AgentManager implements IAgentManager {
  constructor(
    private readonly runtime: Runtime,
    private readonly engine: AgentEngine,
    private readonly errorManager: ErrorManager
  ) {}

  /**
   * Create a new agent instance
   *
   * @param definition - Agent definition (business config)
   * @param _config - Agent config (instance overrides, currently unused)
   */
  create(definition: AgentDefinition, _config?: AgentConfig): Agent {
    logger.debug("Creating agent", { definitionName: definition.name });

    // Create context (pure identity)
    const context: AgentContext = {
      agentId: generateAgentId(),
      createdAt: Date.now(),
    };

    // Create sandbox using runtime
    const sandbox = this.runtime.createSandbox(`sandbox-${context.agentId}`);

    // Create driver using runtime
    // Runtime merges AgentDefinition (business) + RuntimeConfig (infrastructure)
    const driver = this.runtime.createDriver(definition, context, sandbox);

    // Create agent instance with driver and sandbox
    const agent = new AgentInstance(definition, context, this.engine, driver, sandbox);

    // Subscribe to error events for platform-level handling
    agent.on("error", (event: ErrorEvent) => {
      this.errorManager.handle(agent.agentId, event.data.error, event);
    });

    // Register in container
    this.runtime.container.register(agent);

    logger.info("Agent created", {
      agentId: agent.agentId,
      definitionName: definition.name,
      driverName: driver.name,
    });

    return agent;
  }

  /**
   * Get an existing agent by ID
   */
  get(agentId: string): Agent | undefined {
    return this.runtime.container.get(agentId);
  }

  /**
   * Check if an agent exists
   */
  has(agentId: string): boolean {
    return this.runtime.container.has(agentId);
  }

  /**
   * List all agents
   */
  list(): Agent[] {
    return this.runtime.container.getAllIds().map((id) => this.runtime.container.get(id)!);
  }

  /**
   * Destroy an agent by ID
   */
  async destroy(agentId: string): Promise<void> {
    const agent = this.runtime.container.get(agentId);
    if (agent) {
      logger.debug("Destroying agent", { agentId });
      await agent.destroy();
      this.runtime.container.unregister(agentId);
      logger.info("Agent destroyed", { agentId });
    }
  }

  /**
   * Destroy all agents
   */
  async destroyAll(): Promise<void> {
    const agentIds = this.runtime.container.getAllIds();
    logger.debug("Destroying all agents", { count: agentIds.length });
    await Promise.all(agentIds.map((id) => this.destroy(id)));
    logger.info("All agents destroyed", { count: agentIds.length });
  }
}
