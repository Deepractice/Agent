/**
 * CommandHandler - Handles CommandEvent request/response
 *
 * Listens to command request events on the bus and emits response events.
 * This separates event handling logic from RuntimeImpl resource management.
 *
 * Pattern:
 * ```
 * Bus.emit(container_create_request)
 *   → CommandHandler.handleContainerCreate()
 *   → Bus.emit(container_create_response)
 * ```
 */

import type { SystemBus } from "@agentxjs/types/runtime/internal";
import type { SystemEvent } from "@agentxjs/types/event";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("runtime/CommandHandler");

/**
 * Runtime operations interface - what CommandHandler needs to execute commands
 */
export interface RuntimeOperations {
  // Container operations
  createContainer(containerId: string): Promise<{ containerId: string }>;
  getContainer(containerId: string): { containerId: string } | undefined;
  listContainers(): { containerId: string }[];

  // Agent operations
  runAgent(containerId: string, config: { name: string; systemPrompt?: string }): Promise<{ agentId: string; containerId: string }>;
  getAgent(agentId: string): { agentId: string; containerId: string } | undefined;
  listAgents(containerId: string): { agentId: string; containerId: string }[];
  destroyAgent(agentId: string): Promise<boolean>;
  destroyAllAgents(containerId: string): Promise<void>;
  receiveMessage(agentId: string, content: string): Promise<void>;
  interruptAgent(agentId: string): void;

  // Image operations
  snapshotAgent(agentId: string): Promise<{ imageId: string; containerId: string; agentId: string }>;
  listImages(): Promise<{ imageId: string; containerId: string; agentId: string; name: string }[]>;
  getImage(imageId: string): Promise<{ imageId: string; containerId: string; agentId: string; name: string } | null>;
  deleteImage(imageId: string): Promise<void>;
  resumeImage(imageId: string): Promise<{ agentId: string; containerId: string }>;
}

/**
 * Helper to create a command response event
 */
function createResponse<T extends string, D>(type: T, data: D): SystemEvent {
  return {
    type,
    timestamp: Date.now(),
    data,
    source: "command",
    category: "response",
    intent: "result",
  } as SystemEvent;
}

/**
 * CommandHandler - Event handler for command events
 */
export class CommandHandler {
  private readonly bus: SystemBus;
  private readonly ops: RuntimeOperations;
  private readonly unsubscribes: (() => void)[] = [];

  constructor(bus: SystemBus, operations: RuntimeOperations) {
    this.bus = bus;
    this.ops = operations;
    this.bindHandlers();
    logger.debug("CommandHandler created");
  }

  /**
   * Bind all command handlers to the bus
   */
  private bindHandlers(): void {
    // Container commands
    this.unsubscribes.push(
      this.bus.onCommand("container_create_request", (event) => this.handleContainerCreate(event)),
      this.bus.onCommand("container_get_request", (event) => this.handleContainerGet(event)),
      this.bus.onCommand("container_list_request", (event) => this.handleContainerList(event)),
    );

    // Agent commands
    this.unsubscribes.push(
      this.bus.onCommand("agent_run_request", (event) => this.handleAgentRun(event)),
      this.bus.onCommand("agent_get_request", (event) => this.handleAgentGet(event)),
      this.bus.onCommand("agent_list_request", (event) => this.handleAgentList(event)),
      this.bus.onCommand("agent_destroy_request", (event) => this.handleAgentDestroy(event)),
      this.bus.onCommand("agent_destroy_all_request", (event) => this.handleAgentDestroyAll(event)),
      this.bus.onCommand("agent_receive_request", (event) => this.handleAgentReceive(event)),
      this.bus.onCommand("agent_interrupt_request", (event) => this.handleAgentInterrupt(event)),
    );

    // Image commands
    this.unsubscribes.push(
      this.bus.onCommand("image_snapshot_request", (event) => this.handleImageSnapshot(event)),
      this.bus.onCommand("image_list_request", (event) => this.handleImageList(event)),
      this.bus.onCommand("image_get_request", (event) => this.handleImageGet(event)),
      this.bus.onCommand("image_delete_request", (event) => this.handleImageDelete(event)),
      this.bus.onCommand("image_resume_request", (event) => this.handleImageResume(event)),
    );

    logger.debug("Command handlers bound", { count: this.unsubscribes.length });
  }

  // ==================== Container Handlers ====================

  private async handleContainerCreate(event: { data: { requestId: string; containerId: string } }): Promise<void> {
    const { requestId, containerId } = event.data;
    logger.debug("Handling container_create_request", { requestId, containerId });

    try {
      await this.ops.createContainer(containerId);
      this.bus.emit(createResponse("container_create_response", {
        requestId,
        containerId,
      }));
    } catch (err) {
      this.bus.emit(createResponse("container_create_response", {
        requestId,
        containerId,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }

  private handleContainerGet(event: { data: { requestId: string; containerId: string } }): void {
    const { requestId, containerId } = event.data;
    logger.debug("Handling container_get_request", { requestId, containerId });

    const container = this.ops.getContainer(containerId);
    this.bus.emit(createResponse("container_get_response", {
      requestId,
      containerId: container?.containerId,
      exists: !!container,
    }));
  }

  private handleContainerList(event: { data: { requestId: string } }): void {
    const { requestId } = event.data;
    logger.debug("Handling container_list_request", { requestId });

    const containers = this.ops.listContainers();
    this.bus.emit(createResponse("container_list_response", {
      requestId,
      containerIds: containers.map(c => c.containerId),
    }));
  }

  // ==================== Agent Handlers ====================

  private async handleAgentRun(event: { data: { requestId: string; containerId: string; config: { name: string; systemPrompt?: string } } }): Promise<void> {
    const { requestId, containerId, config } = event.data;
    logger.debug("Handling agent_run_request", { requestId, containerId, name: config.name });

    try {
      const agent = await this.ops.runAgent(containerId, config);
      this.bus.emit(createResponse("agent_run_response", {
        requestId,
        containerId,
        agentId: agent.agentId,
      }));
    } catch (err) {
      this.bus.emit(createResponse("agent_run_response", {
        requestId,
        containerId,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }

  private handleAgentGet(event: { data: { requestId: string; agentId: string } }): void {
    const { requestId, agentId } = event.data;
    logger.debug("Handling agent_get_request", { requestId, agentId });

    const agent = this.ops.getAgent(agentId);
    this.bus.emit(createResponse("agent_get_response", {
      requestId,
      agentId: agent?.agentId,
      containerId: agent?.containerId,
      exists: !!agent,
    }));
  }

  private handleAgentList(event: { data: { requestId: string; containerId: string } }): void {
    const { requestId, containerId } = event.data;
    logger.debug("Handling agent_list_request", { requestId, containerId });

    const agents = this.ops.listAgents(containerId);
    this.bus.emit(createResponse("agent_list_response", {
      requestId,
      agents: agents.map(a => ({ agentId: a.agentId, containerId: a.containerId })),
    }));
  }

  private async handleAgentDestroy(event: { data: { requestId: string; agentId: string } }): Promise<void> {
    const { requestId, agentId } = event.data;
    logger.debug("Handling agent_destroy_request", { requestId, agentId });

    try {
      const success = await this.ops.destroyAgent(agentId);
      this.bus.emit(createResponse("agent_destroy_response", {
        requestId,
        agentId,
        success,
      }));
    } catch (err) {
      this.bus.emit(createResponse("agent_destroy_response", {
        requestId,
        agentId,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }

  private async handleAgentDestroyAll(event: { data: { requestId: string; containerId: string } }): Promise<void> {
    const { requestId, containerId } = event.data;
    logger.debug("Handling agent_destroy_all_request", { requestId, containerId });

    try {
      await this.ops.destroyAllAgents(containerId);
      this.bus.emit(createResponse("agent_destroy_all_response", {
        requestId,
        containerId,
      }));
    } catch (err) {
      this.bus.emit(createResponse("agent_destroy_all_response", {
        requestId,
        containerId,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }

  private async handleAgentReceive(event: { data: { requestId: string; agentId: string; content: string } }): Promise<void> {
    const { requestId, agentId, content } = event.data;
    logger.debug("Handling agent_receive_request", { requestId, agentId });

    try {
      await this.ops.receiveMessage(agentId, content);
      this.bus.emit(createResponse("agent_receive_response", {
        requestId,
        agentId,
      }));
    } catch (err) {
      this.bus.emit(createResponse("agent_receive_response", {
        requestId,
        agentId,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }

  private handleAgentInterrupt(event: { data: { requestId: string; agentId: string } }): void {
    const { requestId, agentId } = event.data;
    logger.debug("Handling agent_interrupt_request", { requestId, agentId });

    try {
      this.ops.interruptAgent(agentId);
      this.bus.emit(createResponse("agent_interrupt_response", {
        requestId,
        agentId,
      }));
    } catch (err) {
      this.bus.emit(createResponse("agent_interrupt_response", {
        requestId,
        agentId,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }

  // ==================== Image Handlers ====================

  private async handleImageSnapshot(event: { data: { requestId: string; agentId: string } }): Promise<void> {
    const { requestId, agentId } = event.data;
    logger.debug("Handling image_snapshot_request", { requestId, agentId });

    try {
      const image = await this.ops.snapshotAgent(agentId);
      this.bus.emit(createResponse("image_snapshot_response", {
        requestId,
        record: image,
      }));
    } catch (err) {
      this.bus.emit(createResponse("image_snapshot_response", {
        requestId,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }

  private async handleImageList(event: { data: { requestId: string } }): Promise<void> {
    const { requestId } = event.data;
    logger.debug("Handling image_list_request", { requestId });

    try {
      const images = await this.ops.listImages();
      this.bus.emit(createResponse("image_list_response", {
        requestId,
        records: images,
      }));
    } catch (err) {
      this.bus.emit(createResponse("image_list_response", {
        requestId,
        records: [],
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }

  private async handleImageGet(event: { data: { requestId: string; imageId: string } }): Promise<void> {
    const { requestId, imageId } = event.data;
    logger.debug("Handling image_get_request", { requestId, imageId });

    try {
      const image = await this.ops.getImage(imageId);
      this.bus.emit(createResponse("image_get_response", {
        requestId,
        record: image,
      }));
    } catch (err) {
      this.bus.emit(createResponse("image_get_response", {
        requestId,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }

  private async handleImageDelete(event: { data: { requestId: string; imageId: string } }): Promise<void> {
    const { requestId, imageId } = event.data;
    logger.debug("Handling image_delete_request", { requestId, imageId });

    try {
      await this.ops.deleteImage(imageId);
      this.bus.emit(createResponse("image_delete_response", {
        requestId,
        imageId,
      }));
    } catch (err) {
      this.bus.emit(createResponse("image_delete_response", {
        requestId,
        imageId,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }

  private async handleImageResume(event: { data: { requestId: string; imageId: string } }): Promise<void> {
    const { requestId, imageId } = event.data;
    logger.debug("Handling image_resume_request", { requestId, imageId });

    try {
      const result = await this.ops.resumeImage(imageId);
      this.bus.emit(createResponse("image_resume_response", {
        requestId,
        imageId,
        agentId: result.agentId,
        containerId: result.containerId,
      }));
    } catch (err) {
      this.bus.emit(createResponse("image_resume_response", {
        requestId,
        imageId,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }

  // ==================== Lifecycle ====================

  /**
   * Dispose handler and unsubscribe from all events
   */
  dispose(): void {
    for (const unsubscribe of this.unsubscribes) {
      unsubscribe();
    }
    this.unsubscribes.length = 0;
    logger.debug("CommandHandler disposed");
  }
}
