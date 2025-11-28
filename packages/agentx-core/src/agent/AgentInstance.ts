/**
 * AgentInstance - Runtime instance implementation
 *
 * Implements the Agent interface from @deepractice-ai/agentx-types.
 * Created from AgentDefinition + AgentContext.
 *
 * Coordinates the flow:
 * 1. Driver receives message → produces StreamEvents
 * 2. Engine processes events → produces outputs
 * 3. Presenters handle outputs (external systems)
 * 4. Handlers receive outputs (user subscriptions)
 *
 * Lifecycle:
 * - running: Active, can receive messages
 * - destroyed: Removed from memory, cannot be used
 */

import type {
  Agent,
  AgentDefinition,
  AgentContext,
  AgentLifecycle,
  AgentEventHandler,
  Unsubscribe,
  AgentOutput,
  AgentError,
  ErrorMessageEvent,
  StateChangeHandler,
  EventHandlerMap,
  ReactHandlerMap,
  AgentMiddleware,
  AgentInterceptor,
  // Stream Layer Events
  MessageStartEvent,
  MessageDeltaEvent,
  MessageStopEvent,
  TextContentBlockStartEvent,
  TextDeltaEvent,
  TextContentBlockStopEvent,
  ToolUseContentBlockStartEvent,
  InputJsonDeltaEvent,
  ToolUseContentBlockStopEvent,
  ToolCallEvent,
  ToolResultEvent,
  // Message Layer Events
  UserMessageEvent,
  AssistantMessageEvent,
  ToolUseMessageEvent,
  // Turn Layer Events
  TurnRequestEvent,
  TurnResponseEvent,
} from "@deepractice-ai/agentx-types";
import type { UserMessage, AgentState } from "@deepractice-ai/agentx-types";
import { isStateEvent } from "@deepractice-ai/agentx-types";
import type { AgentEngine } from "@deepractice-ai/agentx-engine";
import { createLogger } from "@deepractice-ai/agentx-logger";
import { AgentStateMachine } from "./AgentStateMachine";

const logger = createLogger("core/AgentInstance");

/**
 * AgentInstance - Implementation of Agent interface
 */
export class AgentInstance implements Agent {
  readonly agentId: string;
  readonly definition: AgentDefinition;
  readonly context: AgentContext;
  readonly createdAt: number;

  private _lifecycle: AgentLifecycle = "running";
  private readonly engine: AgentEngine;

  /**
   * State machine - manages state transitions driven by StateEvents
   */
  private readonly stateMachine = new AgentStateMachine();

  /**
   * Type-based handlers: Map<EventType, Set<Handler>>
   * O(1) lookup by event type
   */
  private readonly typedHandlers: Map<string, Set<AgentEventHandler>> = new Map();

  /**
   * Global handlers: receive all events
   * For backward compatibility with on(handler)
   */
  private readonly globalHandlers: Set<AgentEventHandler> = new Set();

  /**
   * Lifecycle handlers for onReady
   */
  private readonly readyHandlers: Set<() => void> = new Set();

  /**
   * Lifecycle handlers for onDestroy
   */
  private readonly destroyHandlers: Set<() => void> = new Set();

  /**
   * Middleware chain for receive() interception
   */
  private readonly middlewares: AgentMiddleware[] = [];

  /**
   * Interceptor chain for event dispatch interception
   */
  private readonly interceptors: AgentInterceptor[] = [];

  constructor(definition: AgentDefinition, context: AgentContext, engine: AgentEngine) {
    this.agentId = context.agentId;
    this.definition = definition;
    this.context = context;
    this.engine = engine;
    this.createdAt = context.createdAt;

    logger.debug("AgentInstance created", {
      agentId: this.agentId,
      definitionName: definition.name,
    });
  }

  /**
   * Current lifecycle state
   */
  get lifecycle(): AgentLifecycle {
    return this._lifecycle;
  }

  /**
   * Current conversation state (delegated to StateMachine)
   */
  get state(): AgentState {
    return this.stateMachine.state;
  }

  /**
   * Receive a message from user
   *
   * Runs through middleware chain before actual processing.
   *
   * Error Handling:
   * - Errors are caught and converted to ErrorMessageEvent
   * - Handlers receive the error event before re-throwing
   * - This ensures UI can display errors
   */
  async receive(message: string | UserMessage): Promise<void> {
    if (this._lifecycle === "destroyed") {
      logger.warn("Receive called on destroyed agent", { agentId: this.agentId });
      const error = this.createAgentError("system", "AGENT_DESTROYED", "Agent has been destroyed", false);
      const errorEvent = this.createErrorMessageEvent(error);
      this.notifyHandlers(errorEvent);
      throw new Error("[Agent] Agent has been destroyed");
    }

    const userMessage: UserMessage =
      typeof message === "string"
        ? {
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            role: "user",
            content: message,
            timestamp: Date.now(),
          }
        : message;

    logger.debug("Receiving message", {
      agentId: this.agentId,
      messageId: userMessage.id,
    });

    // Run through middleware chain
    await this.executeMiddlewareChain(userMessage);
  }

  /**
   * Execute middleware chain and then process the message
   */
  private async executeMiddlewareChain(message: UserMessage): Promise<void> {
    let index = 0;

    const next = async (msg: UserMessage): Promise<void> => {
      if (index < this.middlewares.length) {
        const middleware = this.middlewares[index++];
        await middleware(msg, next);
      } else {
        // End of chain - do actual processing
        await this.doReceive(msg);
      }
    };

    await next(message);
  }

  /**
   * Actual message processing logic
   *
   * Coordinates the flow:
   * 1. Driver receives message → produces StreamEvents
   * 2. Engine processes events → produces outputs
   * 3. Presenters handle outputs
   * 4. Handlers receive outputs
   */
  private async doReceive(userMessage: UserMessage): Promise<void> {
    try {
      logger.debug("Processing message through driver", {
        agentId: this.agentId,
        messageId: userMessage.id,
      });

      // 1. Get stream events from driver
      const streamEvents = this.definition.driver.receive(userMessage, this.context);

      // 2. Process each stream event through engine
      for await (const streamEvent of streamEvents) {
        const outputs = this.engine.process(this.agentId, streamEvent);

        // 3. Send outputs to presenters
        for (const output of outputs) {
          this.presentOutput(output);
        }

        // 4. Notify handlers (StateEvents will update StateMachine)
        for (const output of outputs) {
          this.notifyHandlers(output);
        }
      }

      logger.debug("Message processing completed", {
        agentId: this.agentId,
        messageId: userMessage.id,
      });
    } catch (error) {
      // Convert error to AgentError and emit as ErrorMessageEvent
      const agentError = this.classifyError(error);
      const errorEvent = this.createErrorMessageEvent(agentError);

      logger.error("Message processing failed", {
        agentId: this.agentId,
        messageId: userMessage.id,
        errorCategory: agentError.category,
        errorCode: agentError.code,
        error,
      });

      // Notify handlers so UI can display the error
      this.notifyHandlers(errorEvent);

      // Re-throw so caller is aware of the failure
      throw error;
    }
    // State will be set to "idle" by ConversationEndStateEvent from Engine
  }

  /**
   * Create an AgentError with the specified category and code
   */
  private createAgentError(
    category: AgentError["category"],
    code: string,
    message: string,
    recoverable: boolean,
    cause?: Error
  ): AgentError {
    return {
      category,
      code,
      message,
      severity: recoverable ? "error" : "fatal",
      recoverable,
      cause,
    } as AgentError;
  }

  /**
   * Classify an unknown error into an AgentError
   */
  private classifyError(error: unknown): AgentError {
    const err = error instanceof Error ? error : new Error(String(error));
    const message = err.message;

    // Try to classify based on error message patterns
    // LLM errors
    if (message.includes("rate limit") || message.includes("429")) {
      return this.createAgentError("llm", "RATE_LIMITED", message, true, err);
    }
    if (message.includes("api key") || message.includes("401") || message.includes("unauthorized")) {
      return this.createAgentError("llm", "INVALID_API_KEY", message, false, err);
    }
    if (message.includes("context") && message.includes("long")) {
      return this.createAgentError("llm", "CONTEXT_TOO_LONG", message, true, err);
    }
    if (message.includes("overloaded") || message.includes("503")) {
      return this.createAgentError("llm", "OVERLOADED", message, true, err);
    }

    // Network errors
    if (message.includes("timeout") || message.includes("ETIMEDOUT")) {
      return this.createAgentError("network", "TIMEOUT", message, true, err);
    }
    if (message.includes("ECONNREFUSED") || message.includes("connection")) {
      return this.createAgentError("network", "CONNECTION_FAILED", message, true, err);
    }
    if (message.includes("network") || message.includes("fetch")) {
      return this.createAgentError("network", "CONNECTION_FAILED", message, true, err);
    }

    // Driver errors
    if (message.includes("driver")) {
      return this.createAgentError("driver", "RECEIVE_FAILED", message, true, err);
    }

    // Default to system error
    return this.createAgentError("system", "UNKNOWN", message, true, err);
  }

  /**
   * Create an ErrorMessageEvent from an AgentError
   */
  private createErrorMessageEvent(error: AgentError): ErrorMessageEvent {
    return {
      type: "error_message",
      uuid: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      agentId: this.agentId,
      timestamp: Date.now(),
      data: {
        id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        role: "error",
        error,
        timestamp: Date.now(),
      },
    };
  }

  /**
   * Send output to all presenters in definition
   */
  private presentOutput(output: AgentOutput): void {
    const presenters = this.definition.presenters ?? [];
    for (const presenter of presenters) {
      try {
        presenter.present(this.agentId, output);
      } catch (error) {
        logger.error("Presenter error", {
          agentId: this.agentId,
          eventType: output.type,
          error,
        });
      }
    }
  }

  /**
   * Subscribe to events
   */
  on(handler: AgentEventHandler): Unsubscribe;

  // Batch subscription with EventHandlerMap
  on(handlers: EventHandlerMap): Unsubscribe;

  // Type-safe overloads for Stream Layer Events
  on(type: "message_start", handler: (event: MessageStartEvent) => void): Unsubscribe;
  on(type: "message_delta", handler: (event: MessageDeltaEvent) => void): Unsubscribe;
  on(type: "message_stop", handler: (event: MessageStopEvent) => void): Unsubscribe;
  on(type: "text_content_block_start", handler: (event: TextContentBlockStartEvent) => void): Unsubscribe;
  on(type: "text_delta", handler: (event: TextDeltaEvent) => void): Unsubscribe;
  on(type: "text_content_block_stop", handler: (event: TextContentBlockStopEvent) => void): Unsubscribe;
  on(type: "tool_use_content_block_start", handler: (event: ToolUseContentBlockStartEvent) => void): Unsubscribe;
  on(type: "input_json_delta", handler: (event: InputJsonDeltaEvent) => void): Unsubscribe;
  on(type: "tool_use_content_block_stop", handler: (event: ToolUseContentBlockStopEvent) => void): Unsubscribe;
  on(type: "tool_call", handler: (event: ToolCallEvent) => void): Unsubscribe;
  on(type: "tool_result", handler: (event: ToolResultEvent) => void): Unsubscribe;

  // Type-safe overloads for Message Layer Events
  on(type: "user_message", handler: (event: UserMessageEvent) => void): Unsubscribe;
  on(type: "assistant_message", handler: (event: AssistantMessageEvent) => void): Unsubscribe;
  on(type: "tool_use_message", handler: (event: ToolUseMessageEvent) => void): Unsubscribe;
  on(type: "error_message", handler: (event: ErrorMessageEvent) => void): Unsubscribe;

  // Type-safe overloads for Turn Layer Events
  on(type: "turn_request", handler: (event: TurnRequestEvent) => void): Unsubscribe;
  on(type: "turn_response", handler: (event: TurnResponseEvent) => void): Unsubscribe;

  // Fallback for custom/unknown types
  on(type: string, handler: AgentEventHandler): Unsubscribe;
  on(types: string[], handler: AgentEventHandler): Unsubscribe;

  on(
    typeOrHandlerOrMap: string | string[] | ((event: any) => void) | EventHandlerMap,
    handler?: (event: any) => void
  ): Unsubscribe {
    // Overload 1: on(handler) - global subscription (function as first arg)
    if (typeof typeOrHandlerOrMap === "function") {
      this.globalHandlers.add(typeOrHandlerOrMap as AgentEventHandler);
      return () => {
        this.globalHandlers.delete(typeOrHandlerOrMap as AgentEventHandler);
      };
    }

    // Overload 2: on(handlers) - batch subscription (object with event handlers)
    if (this.isEventHandlerMap(typeOrHandlerOrMap)) {
      const unsubscribes: Unsubscribe[] = [];

      for (const [eventType, eventHandler] of Object.entries(typeOrHandlerOrMap)) {
        if (eventHandler) {
          if (!this.typedHandlers.has(eventType)) {
            this.typedHandlers.set(eventType, new Set());
          }
          this.typedHandlers.get(eventType)!.add(eventHandler as AgentEventHandler);

          unsubscribes.push(() => {
            this.typedHandlers.get(eventType)?.delete(eventHandler as AgentEventHandler);
          });
        }
      }

      // Return single unsubscribe function that cleans up all subscriptions
      return () => {
        for (const unsub of unsubscribes) {
          unsub();
        }
      };
    }

    // Overload 3 & 4: on(type, handler) or on(types, handler)
    const types = Array.isArray(typeOrHandlerOrMap) ? typeOrHandlerOrMap : [typeOrHandlerOrMap];
    const h = handler! as AgentEventHandler;

    for (const type of types) {
      if (!this.typedHandlers.has(type)) {
        this.typedHandlers.set(type, new Set());
      }
      this.typedHandlers.get(type)!.add(h);
    }

    return () => {
      for (const type of types) {
        this.typedHandlers.get(type)?.delete(h);
      }
    };
  }

  /**
   * Check if the argument is an EventHandlerMap (object with event type keys)
   */
  private isEventHandlerMap(arg: unknown): arg is EventHandlerMap {
    if (typeof arg !== "object" || arg === null || Array.isArray(arg)) {
      return false;
    }
    // Check if it's a plain object (not a function)
    // EventHandlerMap has keys like "text_delta", "assistant_message", etc.
    const keys = Object.keys(arg);
    if (keys.length === 0) {
      return false;
    }
    // All values should be functions or undefined
    return keys.every((key) => {
      const value = (arg as Record<string, unknown>)[key];
      return value === undefined || typeof value === "function";
    });
  }

  /**
   * Subscribe to state changes (delegated to StateMachine)
   *
   * @param handler - Callback receiving { prev, current } state change
   * @returns Unsubscribe function
   */
  onStateChange(handler: StateChangeHandler): Unsubscribe {
    return this.stateMachine.onStateChange(handler);
  }

  /**
   * React-style fluent event subscription
   *
   * Converts onXxx handlers to event type keys and delegates to on(handlers)
   */
  react(handlers: ReactHandlerMap): Unsubscribe {
    const eventHandlerMap: EventHandlerMap = {};

    // Map ReactHandlerMap keys to EventHandlerMap keys
    const mapping: Record<keyof ReactHandlerMap, keyof EventHandlerMap> = {
      // Stream Layer Events
      onMessageStart: "message_start",
      onMessageDelta: "message_delta",
      onMessageStop: "message_stop",
      onTextContentBlockStart: "text_content_block_start",
      onTextDelta: "text_delta",
      onTextContentBlockStop: "text_content_block_stop",
      onToolUseContentBlockStart: "tool_use_content_block_start",
      onInputJsonDelta: "input_json_delta",
      onToolUseContentBlockStop: "tool_use_content_block_stop",
      onToolCall: "tool_call",
      onToolResult: "tool_result",
      // Message Layer Events
      onUserMessage: "user_message",
      onAssistantMessage: "assistant_message",
      onToolUseMessage: "tool_use_message",
      onError: "error_message",
      // Turn Layer Events
      onTurnRequest: "turn_request",
      onTurnResponse: "turn_response",
    };

    // Convert ReactHandlerMap to EventHandlerMap
    for (const [reactKey, eventKey] of Object.entries(mapping)) {
      const handler = handlers[reactKey as keyof ReactHandlerMap];
      if (handler) {
        (eventHandlerMap as any)[eventKey] = handler;
      }
    }

    // Delegate to on(handlers)
    return this.on(eventHandlerMap);
  }

  /**
   * Subscribe to agent ready event
   *
   * If already running, handler is called immediately.
   */
  onReady(handler: () => void): Unsubscribe {
    // If already running, call handler immediately
    if (this._lifecycle === "running") {
      try {
        handler();
      } catch (error) {
        logger.error("onReady handler error", {
          agentId: this.agentId,
          error,
        });
      }
    }

    // Add to handlers for future use (in case of re-initialization patterns)
    this.readyHandlers.add(handler);

    return () => {
      this.readyHandlers.delete(handler);
    };
  }

  /**
   * Subscribe to agent destroy event
   */
  onDestroy(handler: () => void): Unsubscribe {
    this.destroyHandlers.add(handler);

    return () => {
      this.destroyHandlers.delete(handler);
    };
  }

  /**
   * Add middleware to intercept incoming messages
   */
  use(middleware: AgentMiddleware): Unsubscribe {
    this.middlewares.push(middleware);

    return () => {
      const index = this.middlewares.indexOf(middleware);
      if (index !== -1) {
        this.middlewares.splice(index, 1);
      }
    };
  }

  /**
   * Add interceptor to intercept outgoing events
   */
  intercept(interceptor: AgentInterceptor): Unsubscribe {
    this.interceptors.push(interceptor);

    return () => {
      const index = this.interceptors.indexOf(interceptor);
      if (index !== -1) {
        this.interceptors.splice(index, 1);
      }
    };
  }

  /**
   * Abort - System/error forced stop
   */
  abort(): void {
    this.stateMachine.reset();
    // TODO: Signal driver to stop
  }

  /**
   * Interrupt - User-initiated stop
   */
  interrupt(): void {
    this.stateMachine.reset();
    // TODO: Signal driver to stop gracefully
  }

  /**
   * Destroy - Clean up resources
   */
  async destroy(): Promise<void> {
    logger.debug("Destroying agent", { agentId: this.agentId });

    // Notify destroy handlers before cleanup
    for (const handler of this.destroyHandlers) {
      try {
        handler();
      } catch (error) {
        logger.error("onDestroy handler error", {
          agentId: this.agentId,
          error,
        });
      }
    }

    this._lifecycle = "destroyed";
    this.stateMachine.reset();
    this.typedHandlers.clear();
    this.globalHandlers.clear();
    this.readyHandlers.clear();
    this.destroyHandlers.clear();
    this.middlewares.length = 0;
    this.interceptors.length = 0;
    // Clear engine state for this agent
    this.engine.clearState(this.agentId);

    logger.info("Agent destroyed", { agentId: this.agentId });
  }

  /**
   * Notify all registered handlers
   *
   * Runs through interceptor chain before dispatching to handlers.
   */
  private notifyHandlers(event: AgentOutput): void {
    // 1. If StateEvent, let StateMachine process it first (before interceptors)
    if (isStateEvent(event)) {
      this.stateMachine.process(event);
    }

    // 2. Run through interceptor chain
    this.executeInterceptorChain(event);
  }

  /**
   * Execute interceptor chain and then dispatch to handlers
   */
  private executeInterceptorChain(event: AgentOutput): void {
    let index = 0;

    const next = (e: AgentOutput): void => {
      if (index < this.interceptors.length) {
        const interceptor = this.interceptors[index++];
        try {
          interceptor(e, next);
        } catch (error) {
          logger.error("Interceptor error", {
            agentId: this.agentId,
            eventType: e.type,
            interceptorIndex: index - 1,
            error,
          });
          // Continue to next interceptor even if one fails
          next(e);
        }
      } else {
        // End of chain - dispatch to handlers
        this.dispatchToHandlers(e);
      }
    };

    next(event);
  }

  /**
   * Dispatch event to type-specific and global handlers
   */
  private dispatchToHandlers(event: AgentOutput): void {
    // 1. Notify type-specific handlers (O(1) lookup by event.type)
    const typeHandlers = this.typedHandlers.get(event.type);
    if (typeHandlers) {
      for (const handler of typeHandlers) {
        try {
          handler(event);
        } catch (error) {
          logger.error("Event handler error (typed)", {
            agentId: this.agentId,
            eventType: event.type,
            error,
          });
        }
      }
    }

    // 2. Notify global handlers (receive all events)
    for (const handler of this.globalHandlers) {
      try {
        handler(event);
      } catch (error) {
        logger.error("Event handler error (global)", {
          agentId: this.agentId,
          eventType: event.type,
          error,
        });
      }
    }
  }
}
