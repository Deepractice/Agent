/**
 * AgentInstance - Agent runtime instance class
 *
 * Represents a running Agent instance with complete runtime state and metadata.
 * Uses global agentService (stateless runtime manager) internally.
 *
 * Architecture:
 * ```
 * User Code
 *     ↓
 * AgentInstance (this class - stateful)
 *     ↓
 * agentService (stateless singleton)
 *     ↓
 * AgentEngine + globalEventBus
 * ```
 */

import type { AgentInfo, Message, UserMessage, AgentState, Session } from "@deepractice-ai/agentx-types";
import type { AgentDriver, AgentContext, EngineConfig } from "@deepractice-ai/agentx-engine";
import { agentService } from "@deepractice-ai/agentx-engine";
import type { AgentReactor } from "@deepractice-ai/agentx-engine";
import type { EventConsumer, Unsubscribe } from "@deepractice-ai/agentx-engine";
import type { StreamEventType } from "@deepractice-ai/agentx-event";
import { createLogger, type LoggerProvider } from "@deepractice-ai/agentx-logger";

/**
 * Turn statistics
 */
export interface TurnStats {
  totalTurns: number;
  totalTokens: number;
  totalCost: number;
}

/**
 * Event handlers for react() method
 */
export interface EventHandlers {
  onTextDelta?: (event: any) => void;
  onAssistantMessage?: (event: any) => void;
  onToolUseMessage?: (event: any) => void;
  onErrorMessage?: (event: any) => void;
  onConversationActive?: (event: any) => void;
  onTurnComplete?: (event: any) => void;
}

/**
 * AgentInstance summary info (for queries)
 */
export interface AgentInstanceInfo extends AgentInfo {
  sessionId: string | null;
  driverSessionId: string | null;
  state: AgentState;
  instanceCreatedAt: Date;
  lastActivityAt: Date;
  initialized: boolean;
  destroyed: boolean;
  messageCount: number;
  turnStats: Readonly<TurnStats>;
}

/**
 * AgentInstance - Complete runtime instance class
 *
 * Implements AgentInfo fields and provides runtime state management.
 * Delegates runtime operations to global agentService singleton.
 */
export class AgentInstance implements AgentInfo {
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
  private readonly driver: AgentDriver;
  private readonly config?: EngineConfig;
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
    this.config = config;
    this.instanceCreatedAt = new Date();
    this.lastActivityAt = new Date();

    // Create runtime context
    this.context = {
      driverSessionId: driver.driverSessionId || undefined,
      createdAt: Date.now(),
    };

    this.logger = createLogger(`core/agent/AgentInstance/${agentInfo.id}`);

    this.logger.debug("AgentInstance created", {
      agentId: agentInfo.id,
      driverSessionId: this.context.driverSessionId,
      driverType: driver.constructor.name,
    });
  }

  /**
   * Get driver session ID
   */
  get driverSessionId(): string | null {
    return this.driver.driverSessionId;
  }

  /**
   * Initialize agent and start event pipeline
   */
  async initialize(): Promise<void> {
    this.logger.info("Initializing agent", { agentId: this.id });

    // Delegate to agentService singleton
    await agentService.initialize(this.id, this.driver, this.config);

    // Get consumer from agentService
    this.consumer = agentService.getConsumer(this.id);

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
    return agentService.getState(this.id);
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: (state: AgentState, previousState: AgentState) => void): () => void {
    return agentService.onStateChange(this.id, callback);
  }

  /**
   * Export current state to Session
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
  async queue(message: string | UserMessage): Promise<void> {
    const messagePreview = typeof message === "string"
      ? message.substring(0, 50)
      : typeof message.content === "string"
        ? message.content.substring(0, 50)
        : "[Complex message]";
    this.logger.info("Queuing message", { messagePreview });

    if (!this.consumer) {
      this.logger.error("Queue failed: Agent not initialized");
      throw new Error("[AgentInstance] Agent not initialized. Call initialize() first.");
    }

    // Create UserMessage if string provided
    const userMessage: UserMessage =
      typeof message === "string"
        ? {
            id: this.generateId(),
            role: "user",
            content: message,
            timestamp: Date.now(),
          }
        : message;

    // Add to local history (AgentInstance manages message history)
    this._messages.push(userMessage);
    this.logger.debug("Message added to history", {
      messageId: userMessage.id,
      totalMessages: this._messages.length,
    });

    // Delegate to agentService singleton
    await agentService.queue(this.id, userMessage);
  }

  /**
   * Register an AgentReactor
   */
  async registerReactor(reactor: AgentReactor): Promise<Unsubscribe> {
    this.logger.debug("Registering reactor", { reactorName: reactor.name || "Unknown" });

    if (!this.consumer) {
      this.logger.error("RegisterReactor failed: Agent not initialized");
      throw new Error("[AgentInstance] Agent not initialized. Call initialize() first.");
    }

    // Register via agentService
    const unsubscribe = await agentService.registerReactor(this.id, reactor);
    this.handlerUnsubscribers.push(unsubscribe);

    this.logger.info("Reactor registered", {
      reactorName: reactor.name || "Unknown",
      totalSubscriptions: this.handlerUnsubscribers.length,
    });

    return unsubscribe;
  }

  /**
   * Process message(s) and yield stream events
   * Delegates to underlying driver
   */
  async *processMessage(
    messages: UserMessage | AsyncIterable<UserMessage>
  ): AsyncIterable<StreamEventType> {
    yield* this.driver.processMessage(messages);
  }

  /**
   * Abort current operation
   */
  abort(): void {
    agentService.abort(this.id);
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
    const stack = new Error().stack;
    this.logger.info("Destroying agent", {
      agentId: this.id,
      stack: stack?.split("\n").slice(1, 6).join("\n"),
    });

    // Clear message history
    this._messages = [];

    // Unbind all handlers
    this.handlerUnsubscribers.forEach((unsub) => unsub());
    this.handlerUnsubscribers = [];

    // Destroy via agentService
    await agentService.destroy(this.id);

    this.consumer = null;
    this.destroyed = true;

    this.logger.info("Agent destroyed", { agentId: this.id });
  }

  /**
   * Update turn statistics
   */
  updateStats(stats: Partial<TurnStats>): void {
    this._turnStats = { ...this._turnStats, ...stats };
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
      ...this.agentData,
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
   * Send message and wait for completion
   */
  async send(message: string | UserMessage): Promise<void> {
    await this.queue(message);
    // TODO: Wait for completion logic
  }

  /**
   * Register event handlers (simplified API)
   */
  react(handlers: EventHandlers): Unsubscribe {
    if (!this.consumer) {
      throw new Error("[AgentInstance] Agent not initialized. Call initialize() first.");
    }

    const unsubscribers: Unsubscribe[] = [];

    if (handlers.onTextDelta) {
      unsubscribers.push(this.consumer.consumeByType("text_delta", handlers.onTextDelta));
    }
    if (handlers.onAssistantMessage) {
      unsubscribers.push(this.consumer.consumeByType("assistant_message", handlers.onAssistantMessage));
    }
    if (handlers.onToolUseMessage) {
      unsubscribers.push(this.consumer.consumeByType("tool_use_message", handlers.onToolUseMessage));
    }
    if (handlers.onErrorMessage) {
      unsubscribers.push(this.consumer.consumeByType("error_message", handlers.onErrorMessage));
    }
    if (handlers.onConversationActive) {
      unsubscribers.push(this.consumer.consumeByType("conversation_start", handlers.onConversationActive));
    }
    if (handlers.onTurnComplete) {
      unsubscribers.push(this.consumer.consumeByType("turn_response", handlers.onTurnComplete));
    }

    // Track all unsubscribers
    this.handlerUnsubscribers.push(...unsubscribers);

    // Return combined unsubscribe function
    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }

  /**
   * Clear message history
   */
  clearMessages(): void {
    this._messages = [];
  }

  /**
   * Get turn statistics
   */
  get turnStats(): Readonly<TurnStats> {
    return this._turnStats;
  }

  /**
   * Subscribe to message events to maintain history
   */
  private subscribeToMessageEvents(): void {
    if (!this.consumer) return;

    // Subscribe to AssistantMessageEvent
    const unsubAssistant = this.consumer.consumeByType(
      "assistant_message",
      (event: any) => {
        this._messages.push(event.data);
      }
    );

    this.handlerUnsubscribers.push(unsubAssistant);
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
