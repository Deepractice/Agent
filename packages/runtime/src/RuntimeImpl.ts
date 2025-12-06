/**
 * RuntimeImpl - Event-driven Runtime implementation
 *
 * All operations are delegated to SystemBus. CommandHandler listens
 * for command events and executes the actual operations.
 *
 * Architecture:
 * ```
 * RuntimeImpl (implements Runtime extends SystemBus)
 *     │
 *     ├── emit/on/onCommand/emitCommand/request  ← public API
 *     │
 *     ├── bus: SystemBusImpl  ← actual event handling
 *     │
 *     └── commandHandler: CommandHandler  ← listens for commands, executes operations
 * ```
 */

import type { Persistence } from "@agentxjs/types";
import type { Runtime, ClaudeLLMConfig, LLMProvider, ImageMessage } from "@agentxjs/types/runtime";
import type { Agent } from "@agentxjs/types/runtime";
import type { Message } from "@agentxjs/types/agent";
import type {
  Environment,
  BusEventHandler,
  SubscribeOptions,
  Unsubscribe,
} from "@agentxjs/types/runtime/internal";
import type { SystemEvent, CommandEventMap, CommandRequestType, ResponseEventFor, RequestDataFor } from "@agentxjs/types/event";
import type { RuntimeConfig } from "./createRuntime";
import type { RuntimeImageContext, RuntimeContainerContext } from "./internal";
import {
  SystemBusImpl,
  RuntimeAgent,
  RuntimeAgentImage,
  RuntimeContainer,
  CommandHandler,
  type RuntimeOperations,
} from "./internal";
import { ClaudeEnvironment } from "./environment";
import { createLogger } from "@agentxjs/common";
import { homedir } from "node:os";
import { join } from "node:path";

const logger = createLogger("runtime/RuntimeImpl");

/**
 * RuntimeImpl - Implementation of Runtime interface
 *
 * Delegates all SystemBus methods to internal bus instance.
 */
export class RuntimeImpl implements Runtime {
  private readonly persistence: Persistence;
  private readonly llmProvider: LLMProvider<ClaudeLLMConfig>;
  private readonly bus: SystemBusImpl;
  private readonly environment: Environment;
  private readonly basePath: string;
  private readonly commandHandler: CommandHandler;

  /** Container registry: containerId -> RuntimeContainer */
  private readonly containerRegistry = new Map<string, RuntimeContainer>();

  constructor(config: RuntimeConfig) {
    logger.info("RuntimeImpl constructor start");
    this.persistence = config.persistence;
    this.llmProvider = config.llmProvider;
    this.basePath = join(homedir(), ".agentx");

    // Create SystemBus
    logger.info("Creating SystemBus");
    this.bus = new SystemBusImpl();

    // Use custom environment or create ClaudeEnvironment from LLMProvider
    if (config.environment) {
      logger.info("Using custom Environment");
      this.environment = config.environment;
    } else {
      logger.info("Creating ClaudeEnvironment");
      const llmConfig = this.llmProvider.provide();
      this.environment = new ClaudeEnvironment({
        apiKey: llmConfig.apiKey,
        baseUrl: llmConfig.baseUrl,
        model: llmConfig.model,
      });
    }
    logger.info("Connecting Environment to bus");
    this.environment.receptor.emit(this.bus);
    this.environment.effector.subscribe(this.bus);

    // Create CommandHandler to handle command events
    logger.info("Creating CommandHandler");
    this.commandHandler = new CommandHandler(this.bus, this.createRuntimeOperations());

    logger.info("RuntimeImpl constructor done");
  }

  // ==================== SystemBus delegation ====================

  emit(event: SystemEvent): void {
    this.bus.emit(event);
  }

  emitBatch(events: SystemEvent[]): void {
    this.bus.emitBatch(events);
  }

  on<T extends string>(
    typeOrTypes: T | string[],
    handler: BusEventHandler<SystemEvent & { type: T }>,
    options?: SubscribeOptions<SystemEvent & { type: T }>
  ): Unsubscribe {
    return this.bus.on(typeOrTypes, handler, options);
  }

  onAny(handler: BusEventHandler, options?: SubscribeOptions): Unsubscribe {
    return this.bus.onAny(handler, options);
  }

  once<T extends string>(
    type: T,
    handler: BusEventHandler<SystemEvent & { type: T }>
  ): Unsubscribe {
    return this.bus.once(type, handler);
  }

  onCommand<T extends keyof CommandEventMap>(
    type: T,
    handler: (event: CommandEventMap[T]) => void
  ): Unsubscribe {
    return this.bus.onCommand(type, handler);
  }

  emitCommand<T extends keyof CommandEventMap>(
    type: T,
    data: CommandEventMap[T]["data"]
  ): void {
    this.bus.emitCommand(type, data);
  }

  request<T extends CommandRequestType>(
    type: T,
    data: RequestDataFor<T>,
    timeout?: number
  ): Promise<ResponseEventFor<T>> {
    return this.bus.request(type, data, timeout);
  }

  destroy(): void {
    this.bus.destroy();
  }

  // ==================== Runtime Operations (for CommandHandler) ====================

  private createRuntimeOperations(): RuntimeOperations {
    return {
      // Container operations
      createContainer: async (containerId: string) => {
        const container = await this.getOrCreateContainer(containerId);
        return { containerId: container.containerId };
      },
      getContainer: (containerId: string) => {
        const container = this.containerRegistry.get(containerId);
        return container ? { containerId: container.containerId } : undefined;
      },
      listContainers: () => {
        return Array.from(this.containerRegistry.values()).map(c => ({ containerId: c.containerId }));
      },

      // Agent operations
      runAgent: async (containerId: string, config: { name: string; systemPrompt?: string }) => {
        const container = this.containerRegistry.get(containerId);
        if (!container) throw new Error(`Container not found: ${containerId}`);
        const agent = await container.runAgent(config);
        return { agentId: agent.agentId, containerId };
      },
      getAgent: (agentId: string) => {
        const agent = this.findAgent(agentId);
        return agent ? { agentId: agent.agentId, containerId: agent.containerId } : undefined;
      },
      listAgents: (containerId: string) => {
        const container = this.containerRegistry.get(containerId);
        return container?.listAgents().map(a => ({ agentId: a.agentId, containerId: a.containerId })) ?? [];
      },
      destroyAgent: async (agentId: string) => {
        for (const container of this.containerRegistry.values()) {
          if (container.getAgent(agentId)) {
            return container.destroyAgent(agentId);
          }
        }
        return false;
      },
      destroyAllAgents: async (containerId: string) => {
        const container = this.containerRegistry.get(containerId);
        await container?.destroyAllAgents();
      },
      receiveMessage: async (agentId: string, content: string) => {
        const agent = this.findAgent(agentId);
        if (!agent) throw new Error(`Agent not found: ${agentId}`);
        await agent.receive(content);
      },
      interruptAgent: (agentId: string) => {
        const agent = this.findAgent(agentId);
        if (!agent) throw new Error(`Agent not found: ${agentId}`);
        agent.interrupt();
      },

      // Image operations
      snapshotAgent: async (agentId: string) => {
        const agent = this.findAgent(agentId);
        if (!agent) throw new Error(`Agent not found: ${agentId}`);
        if (!(agent instanceof RuntimeAgent)) {
          throw new Error("Agent must be a RuntimeAgent instance");
        }
        const image = await RuntimeAgentImage.snapshot(agent, this.createImageContext());
        return { imageId: image.imageId, containerId: image.containerId, agentId: image.agentId };
      },
      listImages: async () => {
        const records = await this.persistence.images.findAllImages();
        return records.map(r => ({
          imageId: r.imageId,
          containerId: r.containerId,
          agentId: r.agentId,
          name: r.name,
        }));
      },
      getImage: async (imageId: string) => {
        const record = await this.persistence.images.findImageById(imageId);
        if (!record) return null;
        return {
          imageId: record.imageId,
          containerId: record.containerId,
          agentId: record.agentId,
          name: record.name,
        };
      },
      deleteImage: (imageId: string) => this.persistence.images.deleteImage(imageId),
      resumeImage: async (imageId: string) => {
        const record = await this.persistence.images.findImageById(imageId);
        if (!record) throw new Error(`Image not found: ${imageId}`);

        const imageContext = this.createImageContext();
        const image = new RuntimeAgentImage(
          {
            imageId: record.imageId,
            containerId: record.containerId,
            agentId: record.agentId,
            name: record.name,
            description: record.description,
            systemPrompt: record.systemPrompt,
            messages: record.messages as unknown as ImageMessage[],
            parentImageId: record.parentImageId,
            createdAt: record.createdAt,
          },
          imageContext
        );
        const agent = await image.resume();
        return { agentId: agent.agentId, containerId: agent.containerId };
      },
    };
  }

  // ==================== Internal Helpers ====================

  private async getOrCreateContainer(containerId: string): Promise<RuntimeContainer> {
    // Check if already in memory
    const existing = this.containerRegistry.get(containerId);
    if (existing) return existing;

    // Try to load from persistence
    const loaded = await RuntimeContainer.load(containerId, this.createContainerContext());
    if (loaded) {
      this.containerRegistry.set(containerId, loaded);
      return loaded;
    }

    // Create new container
    const container = await RuntimeContainer.create(containerId, this.createContainerContext());
    this.containerRegistry.set(containerId, container);
    return container;
  }

  private findAgent(agentId: string): Agent | undefined {
    for (const container of this.containerRegistry.values()) {
      const agent = container.getAgent(agentId);
      if (agent) return agent;
    }
    return undefined;
  }

  private createContainerContext(): RuntimeContainerContext {
    return {
      persistence: this.persistence,
      bus: this.bus,
      environment: this.environment,
      basePath: this.basePath,
      onDisposed: (containerId) => {
        this.containerRegistry.delete(containerId);
      },
    };
  }

  private createImageContext(): RuntimeImageContext {
    return {
      createAgentWithMessages: async (
        containerId: string,
        config: { name: string; description?: string; systemPrompt?: string },
        messages: Message[]
      ): Promise<Agent> => {
        const container = this.containerRegistry.get(containerId);
        if (!container) {
          throw new Error(`Container not found: ${containerId}`);
        }
        return container.runAgentWithMessages(config, messages);
      },
      imageRepository: this.persistence.images,
    };
  }

  // ==================== Lifecycle ====================

  async dispose(): Promise<void> {
    logger.info("Disposing RuntimeImpl");

    // Dispose CommandHandler
    this.commandHandler.dispose();

    // Dispose all containers (which destroys all agents)
    for (const container of this.containerRegistry.values()) {
      await container.dispose();
    }

    // Dispose environment (if it has a dispose method)
    if ("dispose" in this.environment && typeof this.environment.dispose === "function") {
      (this.environment as { dispose: () => void }).dispose();
    }

    // Destroy bus
    this.bus.destroy();

    // Clear all state
    this.containerRegistry.clear();

    logger.info("RuntimeImpl disposed");
  }
}
