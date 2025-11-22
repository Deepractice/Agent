/**
 * AgentServiceImpl
 *
 * Default implementation of AgentService interface.
 * Provides a simple, reactive interface for agent interactions.
 *
 * Responsibilities:
 * 1. Provide simple public API (queue, registerReactor, clear, destroy)
 * 2. Manage message history
 * 3. Delegate to AgentEngine for orchestration
 * 4. Support dynamic event handlers via react() method
 *
 * Architecture:
 * ```
 * User Code
 *     ↓
 * AgentServiceImpl (this class - implements AgentService)
 *     ↓
 * AgentEngine (orchestration + auto-bind reactors)
 *     ↓
 * EventBus + 4-layer pipeline
 * ```
 *
 * Example:
 * ```typescript
 * const agent = createAgent("my-agent", driver);
 * await agent.initialize();
 *
 * agent.react({
 *   onAssistantMessage(event) {
 *     console.log("Assistant:", event.data.content);
 *   },
 * });
 *
 * await agent.queue("Hello!");
 * await agent.destroy();
 * ```
 */

import type { AgentDriver, AgentContext, EngineConfig } from "@deepractice-ai/agentx-engine";
import { AgentEngine } from "@deepractice-ai/agentx-engine";
import { emitError } from "@deepractice-ai/agentx-engine";
import type { AgentInfo, Message, UserMessage, Session, AgentState } from "@deepractice-ai/agentx-types";
import type {
  UserMessageEvent,
  AssistantMessageEvent,
  EventConsumer,
  Unsubscribe,
  StreamEventType,
} from "@deepractice-ai/agentx-event";
import { createLogger, type LoggerProvider } from "@deepractice-ai/agentx-logger";
import type { AgentInstance, TurnStats, EventHandlers, AgentInstanceInfo } from "./AgentInstance";

/**
 * AgentService
 *
 * Core agent runtime class with user-facing API.
 * Implements AgentInstance interface (which extends AgentInfo and AgentDriver).
 * This is the standard implementation of AgentInstance in the Core layer.
 */
export class AgentService implements AgentInstance {
  // ===== AgentInfo fields (static definition) =====
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly createdAt: number;
  readonly version?: string;
  readonly tags?: string[];
  readonly metadata?: Record<string, unknown>;

  // ===== AgentInstance fields (runtime state) =====
  sessionId: string | null = null;
  context: AgentContext;
  instanceCreatedAt: Date;
  lastActivityAt: Date;
  initialized: boolean = false;
  destroyed: boolean = false;

  private _turnStats: TurnStats = {
    totalTurns: 0,
    totalTokens: 0,
    totalCost: 0,
  };

  // ===== Private implementation details =====
  private readonly agentData: AgentInfo;
  private engine: AgentEngine;
  private driver: AgentDriver;
  private _messages: Message[] = [];
  private consumer: EventConsumer | null = null;
  private handlerUnsubscribers: Unsubscribe[] = [];
  private logger: LoggerProvider;

  constructor(agentInfo: AgentInfo, driver: AgentDriver, config?: EngineConfig) {
    // Initialize AgentInfo fields (static definition)
    this.agentData = agentInfo;
    this.id = agentInfo.id;
    this.name = agentInfo.name;
    this.description = agentInfo.description;
    this.createdAt = agentInfo.createdAt;
    this.version = agentInfo.version;
    this.tags = agentInfo.tags;
    this.metadata = agentInfo.metadata;

    // Initialize runtime fields
    this.driver = driver;
    this.engine = new AgentEngine(driver, config);
    this.instanceCreatedAt = new Date();
    this.lastActivityAt = new Date();

    // Create runtime context
    this.context = {
      driverSessionId: driver.driverSessionId || undefined,
      createdAt: Date.now(),
    };

    this.logger = createLogger(`core/agent/AgentService/${agentInfo.id}`);

    this.logger.debug("AgentService created", {
      agentId: agentInfo.id,
      driverSessionId: this.context.driverSessionId,
      driverType: driver.constructor.name,
    });
  }

  /**
   * Get driver session ID (from AgentDriver interface)
   */
  get driverSessionId(): string | null {
    return this.driver.driverSessionId;
  }

  /**
   * Initialize agent and start event pipeline
   */
  async initialize(): Promise<void> {
    this.logger.info("Initializing agent", { agentId: this.id });

    await this.engine.initialize();

    // Create consumer for user event subscriptions
    this.consumer = this.engine.eventBus.createConsumer();

    // Subscribe to message events to maintain history
    this.subscribeToMessageEvents();

    this.initialized = true;

    this.logger.info("Agent initialized successfully", { agentId: this.id });
  }

  /**
   * Get AgentInfo data (read-only)
   */
  get agent(): Readonly<AgentInfo> {
    return this.agentData;
  }

  /**
   * Get message history
   */
  get messages(): ReadonlyArray<Message> {
    return this._messages;
  }

  /**
   * Get current agent state
   */
  get state(): AgentState {
    return this.engine.state;
  }

  /**
   * Subscribe to state changes
   *
   * @param callback - Called when state changes with (newState, previousState)
   * @returns Unsubscribe function
   */
  onStateChange(callback: (state: AgentState, previousState: AgentState) => void): () => void {
    return this.engine.onStateChange(callback);
  }

  /**
   * Export current state to Session
   * Used for saving/persisting conversation state
   */
  exportToSession(): Omit<Session, "id"> {
    return {
      title: `Conversation with ${this.agentData.name}`,
      agentId: this.agentData.id,
      messages: [...this._messages],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Queue a message for the agent to process
   */
  async queue(message: string): Promise<void> {
    this.logger.info("Queuing message", { messagePreview: message.substring(0, 50) });

    if (!this.consumer) {
      this.logger.error("Queue failed: Agent not initialized");
      throw new Error("[AgentService] Agent not initialized. Call initialize() first.");
    }

    // Validate message
    if (!message || message.trim().length === 0) {
      this.logger.warn("Empty message rejected");
      const producer = this.engine.eventBus.createProducer();
      emitError(
        producer,
        "Message cannot be empty",
        "validation",
        {
          agentId: this.id,
          componentName: "AgentService",
        },
        {
          code: "EMPTY_MESSAGE",
          severity: "error",
        }
      );
      throw new Error("Message cannot be empty");
    }

    // Set queued state immediately (message received by agent)
    this.engine.setState("queued");

    // Create UserMessage
    const userMessage: UserMessage = {
      id: this.generateId(),
      role: "user",
      content: message,
      timestamp: Date.now(),
    };

    this.logger.debug("UserMessage created", { messageId: userMessage.id });

    // Add to history
    this._messages.push(userMessage);
    this.logger.debug("Message added to history", {
      messageId: userMessage.id,
      totalMessages: this._messages.length,
    });

    // Create UserMessageEvent and emit to EventBus
    const userEvent: UserMessageEvent = {
      type: "user_message",
      uuid: this.generateId(),
      agentId: this.id,
      timestamp: Date.now(),
      data: userMessage,
    };

    const producer = this.engine.eventBus.createProducer();
    producer.produce(userEvent);
    this.logger.debug("UserMessageEvent produced", { eventUuid: userEvent.uuid });
  }

  /**
   * Register an AgentReactor
   *
   * Registers a reactor with full lifecycle management (initialize/destroy).
   * The reactor will be initialized immediately if the agent is already initialized.
   *
   * @param reactor - AgentReactor to register
   * @returns Unsubscribe function to destroy and remove the reactor
   *
   * @example
   * ```typescript
   * const LoggerReactor = defineReactor({
   *   name: "Logger",
   *   onAssistantMessage: (event) => {
   *     console.log("Assistant:", event.data.content);
   *   }
   * });
   *
   * const unsubscribe = await agent.registerReactor(
   *   LoggerReactor.create()
   * );
   *
   * // Later: unsubscribe to stop the reactor
   * await unsubscribe();
   * ```
   */
  async registerReactor(reactor: any): Promise<() => void> {
    this.logger.debug("Registering reactor", { reactorName: reactor.name || "Unknown" });

    if (!this.consumer) {
      this.logger.error("RegisterReactor failed: Agent not initialized");
      throw new Error("[AgentService] Agent not initialized. Call initialize() first.");
    }

    // Register via engine
    const unsubscribe = await this.engine.registerReactor(reactor);
    this.handlerUnsubscribers.push(unsubscribe);

    this.logger.info("Reactor registered", {
      reactorName: reactor.name || "Unknown",
      totalSubscriptions: this.handlerUnsubscribers.length,
    });

    return unsubscribe;
  }

  /**
   * Process message(s) and yield stream events (from AgentDriver interface)
   *
   * This allows AgentService to be used as a Driver in nested Agent compositions.
   *
   * @param messages - Single message or async iterable of messages
   * @returns Async iterable of stream events
   */
  async *processMessage(
    messages: UserMessage | AsyncIterable<UserMessage>
  ): AsyncIterable<StreamEventType> {
    // Delegate directly to underlying driver
    yield* this.driver.processMessage(messages);
  }

  /**
   * Abort current operation (from AgentDriver interface)
   */
  abort(): void {
    this.engine.abort();
  }

  /**
   * Clear message history and abort current operation
   */
  clear(): void {
    this.logger.debug("Clearing message history", {
      messageCount: this._messages.length,
    });
    this._messages = [];
    this.abort();
  }

  /**
   * Destroy agent and clean up all resources
   */
  async destroy(): Promise<void> {
    // Log with stack trace to understand who is destroying the agent
    const stack = new Error().stack;
    this.logger.info("Destroying agent", {
      agentId: this.id,
      stack: stack?.split("\n").slice(1, 6).join("\n"), // First 5 frames
    });

    // Clear message history
    this._messages = [];

    // Unbind all handlers
    this.handlerUnsubscribers.forEach((unsub) => unsub());
    this.handlerUnsubscribers = [];

    // Destroy engine
    await this.engine.destroy();

    this.consumer = null;
    this.destroyed = true;

    this.logger.info("Agent destroyed", { agentId: this.id });
  }

  /**
   * Bind event handlers to EventConsumer
   *
   * Discovers all handler methods (starting with "on") and binds them
   * to corresponding event types.
   *
   * @private
   */

  /**
   * Subscribe to message events to maintain history
   */
  private subscribeToMessageEvents(): void {
    if (!this.consumer) return;

    // Subscribe to AssistantMessageEvent
    const unsubAssistant = this.consumer.consumeByType(
      "assistant_message",
      (event: AssistantMessageEvent) => {
        this._messages.push(event.data);
      }
    );

    this.handlerUnsubscribers.push(unsubAssistant);
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // ===== AgentInstance interface methods =====

  /**
   * Get turn statistics (read-only)
   */
  get turnStats(): Readonly<TurnStats> {
    return this._turnStats;
  }

  /**
   * Update turn statistics
   */
  updateStats(stats: Partial<TurnStats>): void {
    Object.assign(this._turnStats, stats);
  }

  /**
   * Update last activity time
   */
  updateLastActivity(): void {
    this.lastActivityAt = new Date();
  }

  /**
   * Get instance summary information
   */
  getInstanceInfo(): AgentInstanceInfo {
    return {
      // AgentInfo fields
      id: this.id,
      name: this.name,
      description: this.description,
      createdAt: this.createdAt,
      version: this.version,
      tags: this.tags,
      metadata: this.metadata,

      // Runtime fields
      sessionId: this.sessionId,
      driverSessionId: this.driverSessionId,
      state: this.state,
      instanceCreatedAt: this.instanceCreatedAt,
      lastActivityAt: this.lastActivityAt,
      initialized: this.initialized,
      destroyed: this.destroyed,
      messageCount: this._messages.length,
      turnStats: this._turnStats,
    };
  }

  /**
   * Send message (alias for queue, waiting for completion)
   */
  async send(message: string | UserMessage): Promise<void> {
    const messageText = typeof message === 'string' ? message : message.content as string;
    return this.queue(messageText);
  }

  /**
   * Register event handlers (simplified API)
   */
  react(handlers: EventHandlers): Unsubscribe {
    if (!this.consumer) {
      throw new Error("Agent not initialized");
    }

    const unsubscribers: Unsubscribe[] = [];

    if (handlers.onTextDelta) {
      const unsub = this.consumer.consumeByType("text_delta", handlers.onTextDelta as any);
      unsubscribers.push(unsub);
    }

    if (handlers.onAssistantMessage) {
      const unsub = this.consumer.consumeByType("assistant_message", handlers.onAssistantMessage as any);
      unsubscribers.push(unsub);
    }

    if (handlers.onToolUseMessage) {
      const unsub = this.consumer.consumeByType("tool_use_message", handlers.onToolUseMessage as any);
      unsubscribers.push(unsub);
    }

    if (handlers.onErrorMessage) {
      const unsub = this.consumer.consumeByType("error_message", handlers.onErrorMessage as any);
      unsubscribers.push(unsub);
    }

    // TODO: Add support for state and turn events
    // if (handlers.onConversationActive) {
    //   const unsub = this.consumer.consumeByType("conversation_active", handlers.onConversationActive as any);
    //   unsubscribers.push(unsub);
    // }

    // if (handlers.onTurnComplete) {
    //   const unsub = this.consumer.consumeByType("turn_complete", handlers.onTurnComplete as any);
    //   unsubscribers.push(unsub);
    // }

    // Store all unsubscribers
    unsubscribers.forEach(u => this.handlerUnsubscribers.push(u));

    // Return combined unsubscribe function
    return () => {
      unsubscribers.forEach(u => u());
    };
  }

  /**
   * Clear message history
   */
  clearMessages(): void {
    this._messages = [];
  }
}
