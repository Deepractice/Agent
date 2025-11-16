/**
 * AgentService
 *
 * User-facing API facade for Agent functionality.
 * Provides a simple, reactive interface while hiding internal complexity.
 *
 * Responsibilities:
 * 1. Provide simple public API (send, react, clear, destroy)
 * 2. Manage message history
 * 3. Delegate to AgentRuntime for orchestration
 * 4. Support dynamic event handlers via react() method
 *
 * Architecture:
 * ```
 * User Code
 *     ↓
 * AgentService (this class - simple API)
 *     ↓
 * AgentRuntime (orchestration + auto-bind reactors)
 *     ↓
 * EventBus + 4-layer pipeline
 * ```
 *
 * Example:
 * ```typescript
 * const driver = new ClaudeDriver(config);
 * const agent = new AgentService(driver);
 *
 * await agent.initialize();
 *
 * // Subscribe to events directly
 * agent.react({
 *   onAssistantMessage(event) {
 *     console.log("Assistant:", event.data.content);
 *   },
 * });
 *
 * await agent.send("Hello!");
 *
 * await agent.destroy();
 * ```
 */

import { AgentEngine, type EngineConfig } from "./AgentEngine";
import type { AgentDriver } from "./driver";
import type { AgentLogger } from "./AgentLogger";
// Reactor type removed - users just pass event handler objects
import type { Message, UserMessage } from "@deepractice-ai/agentx-types";
import type {
  UserMessageEvent,
  AssistantMessageEvent,
  EventConsumer,
  Unsubscribe,
} from "@deepractice-ai/agentx-event";

/**
 * AgentService
 *
 * Simple, user-friendly API for Agent interactions.
 */
export class AgentService {
  readonly id: string;
  readonly sessionId: string;

  // Core engine
  private engine: AgentEngine;
  private logger?: AgentLogger;

  // Message history
  private _messages: Message[] = [];

  // Event consumer for message tracking and event handlers
  private consumer: EventConsumer | null = null;
  private handlerUnsubscribers: Unsubscribe[] = [];

  constructor(driver: AgentDriver, logger?: AgentLogger, config?: EngineConfig) {
    this.engine = new AgentEngine(driver, logger, config);
    this.logger = logger;
    this.id = this.engine.agentId;
    this.sessionId = this.engine.sessionId;
  }

  /**
   * Initialize agent and start event pipeline
   */
  async initialize(): Promise<void> {
    await this.engine.initialize();

    // Create consumer for user event subscriptions
    this.consumer = this.engine.eventBus.createConsumer();

    // Subscribe to message events to maintain history
    this.subscribeToMessageEvents();

    this.logger?.info("[AgentService] Agent initialized and ready", {
      agentId: this.id,
      sessionId: this.sessionId,
    });
  }

  /**
   * Get message history
   */
  get messages(): ReadonlyArray<Message> {
    return this._messages;
  }

  /**
   * Send a message to the agent
   */
  async send(message: string): Promise<void> {
    if (!this.consumer) {
      throw new Error("[AgentService] Agent not initialized. Call initialize() first.");
    }

    this.logger?.debug("[AgentService] Sending user message", {
      agentId: this.id,
      messageLength: message.length,
    });

    // Create UserMessage
    const userMessage: UserMessage = {
      id: this.generateId(),
      role: "user",
      content: message,
      timestamp: Date.now(),
    };

    // Add to history
    this._messages.push(userMessage);

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

    this.logger?.debug("[AgentService] User message emitted", {
      agentId: this.id,
      eventUuid: userEvent.uuid,
    });
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
    console.log("[AgentService.react] Called with handlers:", Object.keys(handlers));

    if (!this.consumer) {
      console.log("[AgentService.react] ERROR: No consumer, agent not initialized");
      throw new Error("[AgentService] Agent not initialized. Call initialize() first.");
    }

    console.log("[AgentService.react] Consumer exists, binding handlers...");

    // Bind the handlers
    const unsubscribe = this.bindHandlers(this.consumer, handlers);
    this.handlerUnsubscribers.push(unsubscribe);

    console.log("[AgentService.react] Handlers bound successfully. Total: ", this.handlerUnsubscribers.length);

    this.logger?.debug("[AgentService] Event handlers registered", {
      agentId: this.id,
      handlerType: handlers.constructor?.name || "Anonymous",
      totalHandlers: this.handlerUnsubscribers.length,
    });

    return unsubscribe;
  }

  /**
   * Clear message history and abort current operation
   */
  clear(): void {
    const clearedCount = this._messages.length;

    this.logger?.info("[AgentService] Clearing messages and aborting", {
      agentId: this.id,
      clearedMessages: clearedCount,
    });

    this._messages = [];
    this.engine.abort();

    this.logger?.debug("[AgentService] Messages cleared", {
      agentId: this.id,
      previousCount: clearedCount,
      currentCount: this._messages.length,
    });
  }

  /**
   * Destroy agent and clean up all resources
   */
  async destroy(): Promise<void> {
    this.logger?.info("[AgentService] Destroying agent", {
      agentId: this.id,
      sessionId: this.sessionId,
    });

    // Clear message history
    this._messages = [];

    // Unbind all handlers
    this.handlerUnsubscribers.forEach((unsub) => unsub());
    this.handlerUnsubscribers = [];

    // Destroy engine
    await this.engine.destroy();

    this.consumer = null;

    this.logger?.info("[AgentService] Agent destroyed", {
      agentId: this.id,
    });
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

    console.log("[bindHandlers] All handler keys:", Object.keys(handlers));

    // Discover all handler methods (methods starting with "on")
    const handlerMethods = Object.keys(handlers).filter(
      (key) => key.startsWith("on") && typeof handlers[key] === "function"
    );

    console.log("[bindHandlers] Handler methods found:", handlerMethods);

    // Bind each handler method
    for (const methodName of handlerMethods) {
      // Convert method name to event type
      // onTextDelta → text_delta
      // onMessageStop → message_stop
      const eventType = this.methodNameToEventType(methodName);

      console.log(`[bindHandlers] Binding ${methodName} → ${eventType}`);

      // Bind the handler
      const handler = handlers[methodName].bind(handlers);
      const unsubscribe = consumer.consumeByType(eventType as any, handler);
      unsubscribers.push(unsubscribe);

      console.log(`[bindHandlers] Successfully bound ${eventType}`);

      this.logger?.debug("[AgentService] Event handler bound", {
        agentId: this.id,
        methodName,
        eventType,
      });
    }

    console.log(`[bindHandlers] Total handlers bound: ${unsubscribers.length}`);

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

        this.logger?.debug("[AgentService] Assistant message added to history", {
          agentId: this.id,
          messageId: event.data.id,
          historyLength: this._messages.length,
        });
      }
    );

    this.handlerUnsubscribers.push(unsubAssistant);
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
