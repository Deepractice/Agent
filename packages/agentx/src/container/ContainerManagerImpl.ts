/**
 * ContainerManagerImpl - Implementation of ContainerManager
 *
 * Manages container lifecycle and agent runtime using:
 * - Repository: Persistence for ContainerRecord
 * - Runtime: createSandbox, createDriver for agent creation
 * - AgentEngine: Event processing
 */

import type {
  Agent,
  AgentImage,
  Session,
  ContainerRecord,
  ContainerConfig,
  Repository,
  Runtime,
  AgentContext,
  AgentDefinition,
  Container,
} from "@agentxjs/types";
import { AgentInstance, MemoryContainer } from "@agentxjs/agent";
import { AgentEngine } from "@agentxjs/engine";
import { createLogger } from "@agentxjs/common";
import type { ContainerManager } from "./ContainerManager";

const logger = createLogger("agentx/ContainerManager");

/**
 * Generate unique container ID
 */
function generateContainerId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `container_${timestamp}_${random}`;
}

/**
 * Generate unique agent ID
 */
function generateAgentId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `agent_${timestamp}_${random}`;
}

/**
 * ContainerManager implementation
 */
export class ContainerManagerImpl implements ContainerManager {
  private readonly container: Container = new MemoryContainer();
  private readonly engine: AgentEngine;
  private readonly runtime: Runtime;
  private readonly repository: Repository;

  constructor(runtime: Runtime, repository: Repository) {
    this.runtime = runtime;
    this.repository = repository;
    this.engine = new AgentEngine();
  }

  // ==================== Container Lifecycle ====================

  async create(config?: ContainerConfig): Promise<ContainerRecord> {
    const containerId = generateContainerId();
    const now = Date.now();

    const record: ContainerRecord = {
      containerId,
      createdAt: now,
      updatedAt: now,
      config,
    };

    await this.repository.saveContainer(record);

    logger.info("Container created", { containerId });

    return record;
  }

  async get(containerId: string): Promise<ContainerRecord | null> {
    return this.repository.findContainerById(containerId);
  }

  async list(): Promise<ContainerRecord[]> {
    return this.repository.findAllContainers();
  }

  async delete(containerId: string): Promise<boolean> {
    const exists = await this.repository.containerExists(containerId);
    if (!exists) {
      return false;
    }

    await this.repository.deleteContainer(containerId);
    logger.info("Container deleted", { containerId });
    return true;
  }

  async exists(containerId: string): Promise<boolean> {
    return this.repository.containerExists(containerId);
  }

  // ==================== Agent Runtime ====================

  async run(image: AgentImage, containerId: string): Promise<Agent> {
    logger.info("Running agent from image", {
      imageId: image.imageId,
      containerId,
    });

    // Verify container exists
    const container = await this.repository.findContainerById(containerId);
    if (!container) {
      throw new Error(`Container not found: ${containerId}`);
    }

    // Resolve agent ID (local or from server depending on Runtime)
    let agentId: string;
    if (this.runtime.agentIdResolver) {
      agentId = await this.runtime.agentIdResolver.resolveForRun(image.imageId, containerId);
    } else {
      agentId = generateAgentId();
    }

    // Create context
    const context: AgentContext = {
      agentId,
      createdAt: Date.now(),
    };

    // Create sandbox using containerId for isolation
    const sandbox = this.runtime.createSandbox(containerId);

    // Create driver
    const driver = this.runtime.createDriver(image.definition, context, sandbox);

    // Create agent
    const agent = new AgentInstance(image.definition, context, this.engine, driver, sandbox);

    // Register agent in container
    this.container.register(agent);

    logger.info("Agent started", {
      agentId,
      imageId: image.imageId,
      containerId,
      definitionName: image.definition.name,
    });

    return agent;
  }

  async resume(session: Session, containerId: string): Promise<Agent> {
    logger.info("Resuming agent from session", {
      sessionId: session.sessionId,
      imageId: session.imageId,
      containerId,
    });

    // Verify container exists
    const container = await this.repository.findContainerById(containerId);
    if (!container) {
      throw new Error(`Container not found: ${containerId}`);
    }

    // Get image from repository
    const imageRecord = await this.repository.findImageById(session.imageId);
    if (!imageRecord) {
      throw new Error(`Image not found: ${session.imageId}`);
    }

    // Resolve agent ID (local or from server depending on Runtime)
    let agentId: string;
    if (this.runtime.agentIdResolver) {
      agentId = await this.runtime.agentIdResolver.resolveForResume(session.sessionId, containerId);
    } else {
      agentId = generateAgentId();
    }

    // Create context
    const context: AgentContext = {
      agentId,
      createdAt: Date.now(),
    };

    // Create sandbox using containerId for isolation
    const sandbox = this.runtime.createSandbox(containerId);

    // Create driver
    const definition = imageRecord.definition as unknown as AgentDefinition;
    const driver = this.runtime.createDriver(definition, context, sandbox);

    // Create agent
    const agent = new AgentInstance(definition, context, this.engine, driver, sandbox);

    // Register agent in container
    this.container.register(agent);

    logger.info("Agent resumed", {
      agentId,
      sessionId: session.sessionId,
      imageId: session.imageId,
      containerId,
    });

    return agent;
  }

  async destroyAgent(agentId: string): Promise<void> {
    const agent = this.container.get(agentId);
    if (!agent) {
      logger.warn("Agent not found for destroy", { agentId });
      return;
    }

    logger.debug("Destroying agent", { agentId });
    await agent.destroy();
    this.container.unregister(agentId);
    logger.info("Agent destroyed", { agentId });
  }

  getAgent(agentId: string): Agent | undefined {
    return this.container.get(agentId);
  }

  hasAgent(agentId: string): boolean {
    return this.container.has(agentId);
  }

  listAgents(): Agent[] {
    return this.container.list();
  }

  async destroyAllAgents(): Promise<void> {
    const agentIds = this.container.listIds();
    logger.debug("Destroying all agents", { count: agentIds.length });
    await Promise.all(agentIds.map((id) => this.destroyAgent(id)));
    logger.info("All agents destroyed", { count: agentIds.length });
  }
}
