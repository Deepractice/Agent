/**
 * AgentServiceImpl
 *
 * Default implementation of AgentService interface.
 * Provides a simple, reactive interface for agent interactions.
 *
 * Responsibilities:
 * 1. Provide simple public API (send, react, clear, destroy)
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
 * await agent.send("Hello!");
 * await agent.destroy();
 * ```
 */

import type { AgentService } from "~/interfaces/AgentService";
import type { AgentDriver } from "~/interfaces/AgentDriver";
import type { AgentContext } from "~/interfaces/AgentContext";
import { AgentEngine, type EngineConfig } from "./AgentEngine";
// Reactor type removed - users just pass event handler objects
import type { Agent, Message, UserMessage, Session } from "@deepractice-ai/agentx-types";
import type {
  UserMessageEvent,
  AssistantMessageEvent,
  EventConsumer,
  Unsubscribe,
  StreamEventType,
} from "@deepractice-ai/agentx-event";
import { emitError } from "~/utils/emitError";
import { createLogger, type LoggerProvider } from "@deepractice-ai/agentx-logger";

/**
 * AgentServiceImpl
 *
 * Default implementation of AgentService interface.
 * Since AgentService extends AgentDriver, this automatically implements the Driver interface,
 * allowing Agents to be composed/nested (Agent-as-Driver pattern).
 */
export class AgentServiceImpl implements AgentService {
  readonly id: string;
  readonly sessionId: string;

  // Agent data (from agentx-types) - static definition
  private readonly agentData: Agent;

  // Agent context (runtime state)
  private readonly context: AgentContext;

  // Core engine
  private engine: AgentEngine;
  private driver: AgentDriver;

  // Message history
  private _messages: Message[] = [];

  // Event consumer for message tracking and event handlers
  private consumer: EventConsumer | null = null;
  private handlerUnsubscribers: Unsubscribe[] = [];

  // Logger
  private logger: LoggerProvider;

  constructor(agent: Agent, driver: AgentDriver, config?: EngineConfig) {
    this.agentData = agent;
    this.engine = new AgentEngine(driver, config);
    this.driver = driver;
    this.id = agent.id;
    this.sessionId = this.engine.sessionId;

    // Create runtime context
    this.context = {
      sessionId: this.engine.sessionId,
      driverSessionId: driver.driverSessionId || undefined,
      createdAt: Date.now(),
    };

    this.logger = createLogger(`core/agent/AgentServiceImpl/${agent.id}`);

    this.logger.debug("AgentService created", {
      agentId: agent.id,
      sessionId: this.context.sessionId,
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

    this.logger.info("Agent initialized successfully", { agentId: this.id });
  }

  /**
   * Get Agent data (read-only)
   */
  get agent(): Readonly<Agent> {
    return this.agentData;
  }

  /**
   * Get message history
   */
  get messages(): ReadonlyArray<Message> {
    return this._messages;
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
   * Send a message to the agent
   */
  async send(message: string): Promise<void> {
    this.logger.info("Sending message", { messagePreview: message.substring(0, 50) });

    if (!this.consumer) {
      this.logger.error("Send failed: Agent not initialized");
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
    const unsubscribe = await this.engine.registerPeerReactor(reactor);
    this.handlerUnsubscribers.push(unsubscribe);

    this.logger.info("Reactor registered", {
      reactorName: reactor.name || "Unknown",
      totalSubscriptions: this.handlerUnsubscribers.length,
    });

    return unsubscribe;
  }

  /**
   * Send message(s) and yield stream events (from AgentDriver interface)
   *
   * This allows AgentService to be used as a Driver in nested Agent compositions.
   *
   * @param messages - Single message or async iterable of messages
   * @returns Async iterable of stream events
   */
  async *sendMessage(
    messages: UserMessage | AsyncIterable<UserMessage>
  ): AsyncIterable<StreamEventType> {
    // Delegate directly to underlying driver
    yield* this.driver.sendMessage(messages);
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
}
