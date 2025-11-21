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
  exportToSession(): Omit<Session, 'id'> {
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
   * Register event handlers
   *
   * Automatically discovers all handler methods (starting with "on") and binds them
   * to corresponding event types.
   *
   * Method naming convention:
   * - onTextDelta → subscribes to "text_delta" event
   * - onMessageStop → subscribes to "message_stop" event
   * - onUserMessage → subscribes to "user_message" event
   * - onAssistantMessage → subscribes to "assistant_message" event
   *
   * @param handlers - An object with event handler methods
   * @returns Unsubscribe function to remove all handlers
   *
   * @example
   * ```typescript
   * // Simple event handlers
   * agent.react({
   *   onAssistantMessage(event) {
   *     console.log("Assistant:", event.data.content);
   *   },
   *   onUserMessage(event) {
   *     console.log("User:", event.data.content);
   *   },
   * });
   *
   * // Handler class
   * class ChatUI {
   *   onUserMessage(event) {
   *     this.displayUserMessage(event.data);
   *   }
   *   onAssistantMessage(event) {
   *     this.displayAssistantMessage(event.data);
   *   }
   * }
   *
   * agent.react(new ChatUI());
   * ```
   */
  react(handlers: Record<string, any>): () => void {
    const handlerNames = Object.keys(handlers).filter((k) => k.startsWith("on"));
    this.logger.debug("Registering event handlers", { handlers: handlerNames });

    if (!this.consumer) {
      this.logger.error("React failed: Agent not initialized");
      throw new Error("[AgentService] Agent not initialized. Call initialize() first.");
    }

    // Bind the handlers
    const unsubscribe = this.bindHandlers(this.consumer, handlers);
    this.handlerUnsubscribers.push(unsubscribe);

    this.logger.info("Event handlers registered", {
      handlerCount: handlerNames.length,
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
  private bindHandlers(consumer: EventConsumer, handlers: Record<string, any>): Unsubscribe {
    const unsubscribers: Unsubscribe[] = [];

    // Discover all handler methods (methods starting with "on")
    const handlerMethods = Object.keys(handlers).filter(
      (key) => key.startsWith("on") && typeof handlers[key] === "function"
    );

    this.logger.debug("Binding event handlers", { methods: handlerMethods });

    // Bind each handler method
    for (const methodName of handlerMethods) {
      // Convert method name to event type
      // onTextDelta → text_delta
      // onMessageStop → message_stop
      const eventType = this.methodNameToEventType(methodName);

      this.logger.debug("Binding handler", { methodName, eventType });

      // Bind the handler
      const handler = handlers[methodName].bind(handlers);
      const unsubscribe = consumer.consumeByType(eventType as any, handler);
      unsubscribers.push(unsubscribe);
    }

    this.logger.debug("All handlers bound", { count: unsubscribers.length });

    // Return combined unsubscribe function
    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }

  /**
   * Convert method name to event type
   *
   * Examples:
   * - onTextDelta → text_delta
   * - onMessageStop → message_stop
   * - onUserMessage → user_message
   * - onToolUseContentBlockStart → tool_use_content_block_start
   *
   * @private
   */
  private methodNameToEventType(methodName: string): string {
    // Remove "on" prefix
    const withoutOn = methodName.slice(2);

    // Convert PascalCase to snake_case
    return withoutOn
      .replace(/([A-Z])/g, "_$1")
      .toLowerCase()
      .slice(1); // Remove leading underscore
  }

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
