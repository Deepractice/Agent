/**
 * AgentService (Runtime Manager)
 *
 * Stateless singleton service that manages agent runtime operations.
 * Similar to service layer in web applications - provides centralized
 * runtime API that operates on agent instances by agentId.
 *
 * Architecture:
 * - Engine Layer (this file): Stateless runtime manager
 * - Core Layer (Agent class): Stateful agent instances
 *
 * All methods accept agentId as first parameter to operate on specific agents.
 */

import { createLogger, type LoggerProvider } from "@deepractice-ai/agentx-logger";
import type { AgentDriver } from "./AgentDriver";
import type { EngineConfig } from "./AgentEngine";
import { AgentEngine } from "./AgentEngine";
import { globalEventBus } from "./RxJSEventBus";
import type { AgentReactor } from "./AgentReactor";
import type { UserMessage, AgentState } from "@deepractice-ai/agentx-types";
import type { EventConsumer } from "./bus/EventConsumer";
import type { UserMessageEvent } from "@deepractice-ai/agentx-event";

/**
 * Agent runtime state managed by service
 */
interface AgentRuntimeState {
  agentId: string;
  engine: AgentEngine;
  driver: AgentDriver;
  consumer: EventConsumer | null;
  initialized: boolean;
}

/**
 * AgentService - Stateless Runtime Manager
 *
 * Singleton service that manages all agent runtime operations.
 * Provides centralized API for agent lifecycle and operations.
 */
export class AgentService {
  private static instance: AgentService | null = null;
  private logger: LoggerProvider;

  // Runtime state storage (indexed by agentId)
  private runtimes: Map<string, AgentRuntimeState> = new Map();

  private constructor() {
    this.logger = createLogger("engine/AgentService");
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AgentService {
    if (!this.instance) {
      this.instance = new AgentService();
    }
    return this.instance;
  }

  /**
   * Initialize an agent runtime
   *
   * @param agentId - Unique agent identifier
   * @param driver - Agent driver implementation
   * @param config - Engine configuration
   */
  async initialize(
    agentId: string,
    driver: AgentDriver,
    config?: EngineConfig
  ): Promise<void> {
    this.logger.info("Initializing agent runtime", { agentId });

    if (this.runtimes.has(agentId)) {
      this.logger.warn("Agent already initialized", { agentId });
      throw new Error(`[AgentService] Agent ${agentId} is already initialized`);
    }

    // Create engine with global EventBus
    const engine = new AgentEngine(driver, {
      ...config,
      eventBus: globalEventBus,
    });

    // Initialize engine
    await engine.initialize();

    // Create consumer for event subscriptions
    const consumer = globalEventBus.createConsumer();

    // Store runtime state
    this.runtimes.set(agentId, {
      agentId,
      engine,
      driver,
      consumer,
      initialized: true,
    });

    this.logger.info("Agent runtime initialized", { agentId });
  }

  /**
   * Queue a message for processing
   *
   * @param agentId - Agent identifier
   * @param message - User message (string or UserMessage object)
   */
  async queue(agentId: string, message: string | UserMessage): Promise<void> {
    const runtime = this.getRuntime(agentId);

    this.logger.info("Queuing message", { agentId });

    // Validate message
    if (typeof message === "string" && message.trim().length === 0) {
      this.logger.warn("Empty message rejected", { agentId });
      throw new Error("Message cannot be empty");
    }

    // Set queued state
    runtime.engine.setState("queued");

    // Convert string to UserMessage if needed
    const userMessage: UserMessage =
      typeof message === "string"
        ? {
            id: this.generateId(),
            role: "user",
            content: message,
            timestamp: Date.now(),
          }
        : message;

    this.logger.debug("UserMessage created", { agentId, messageId: userMessage.id });

    // Create UserMessageEvent and emit to EventBus
    const userEvent: UserMessageEvent = {
      type: "user_message",
      uuid: this.generateId(),
      agentId,
      timestamp: Date.now(),
      data: userMessage,
    };

    const producer = globalEventBus.createProducer();
    producer.produce(userEvent);

    this.logger.debug("UserMessageEvent produced", {
      agentId,
      eventUuid: userEvent.uuid,
    });
  }

  /**
   * Register a reactor to the agent
   *
   * @param agentId - Agent identifier
   * @param reactor - Reactor to register
   * @returns Unregister function
   */
  async registerReactor(agentId: string, reactor: AgentReactor): Promise<() => void> {
    const runtime = this.getRuntime(agentId);
    return runtime.engine.registerReactor(reactor);
  }

  /**
   * Get event consumer for the agent
   *
   * @param agentId - Agent identifier
   * @returns EventConsumer instance
   */
  getConsumer(agentId: string): EventConsumer {
    const runtime = this.getRuntime(agentId);
    if (!runtime.consumer) {
      throw new Error(`[AgentService] Consumer not available for agent ${agentId}`);
    }
    return runtime.consumer;
  }

  /**
   * Get current agent state
   *
   * @param agentId - Agent identifier
   * @returns Current agent state
   */
  getState(agentId: string): AgentState {
    const runtime = this.getRuntime(agentId);
    return runtime.engine.state;
  }

  /**
   * Subscribe to state changes
   *
   * @param agentId - Agent identifier
   * @param callback - State change callback
   * @returns Unsubscribe function
   */
  onStateChange(
    agentId: string,
    callback: (state: AgentState, previousState: AgentState) => void
  ): () => void {
    const runtime = this.getRuntime(agentId);
    return runtime.engine.onStateChange(callback);
  }

  /**
   * Set agent state manually
   *
   * @param agentId - Agent identifier
   * @param state - New state to set
   */
  setState(agentId: string, state: AgentState): void {
    const runtime = this.getRuntime(agentId);
    runtime.engine.setState(state);
  }

  /**
   * Abort current operation
   *
   * @param agentId - Agent identifier
   */
  abort(agentId: string): void {
    const runtime = this.getRuntime(agentId);
    this.logger.info("Aborting agent operation", { agentId });
    runtime.driver.abort();
  }

  /**
   * Destroy agent runtime and cleanup resources
   *
   * @param agentId - Agent identifier
   */
  async destroy(agentId: string): Promise<void> {
    const runtime = this.runtimes.get(agentId);
    if (!runtime) {
      this.logger.warn("Agent not found for destroy", { agentId });
      return;
    }

    this.logger.info("Destroying agent runtime", { agentId });

    // Destroy engine
    await runtime.engine.destroy();

    // Destroy driver
    await runtime.driver.destroy();

    // Remove from runtime map
    this.runtimes.delete(agentId);

    this.logger.info("Agent runtime destroyed", { agentId });
  }

  /**
   * Check if agent is initialized
   *
   * @param agentId - Agent identifier
   * @returns True if agent is initialized
   */
  isInitialized(agentId: string): boolean {
    return this.runtimes.has(agentId);
  }

  /**
   * Get runtime state (internal use)
   *
   * @param agentId - Agent identifier
   * @returns Runtime state
   * @throws Error if agent not initialized
   */
  private getRuntime(agentId: string): AgentRuntimeState {
    const runtime = this.runtimes.get(agentId);
    if (!runtime) {
      this.logger.error("Agent not initialized", { agentId });
      throw new Error(
        `[AgentService] Agent ${agentId} not initialized. Call initialize() first.`
      );
    }
    return runtime;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

/**
 * Global singleton instance
 *
 * Import this to use the agent service:
 * ```typescript
 * import { agentService } from "@deepractice-ai/agentx-engine";
 *
 * await agentService.initialize("agent-1", driver);
 * await agentService.queue("agent-1", "Hello!");
 * ```
 */
export const agentService = AgentService.getInstance();
