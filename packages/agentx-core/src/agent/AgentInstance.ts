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
  StateChangeHandler,
  EventHandlerMap,
  ReactHandlerMap,
  AgentMiddleware,
  AgentInterceptor,
  EventConsumer,
  AgentDriver,
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
  ToolCallMessageEvent,
  ToolResultMessageEvent,
  ErrorMessageEvent,
  // Turn Layer Events
  TurnRequestEvent,
  TurnResponseEvent,
  // State Layer Events
  ConversationQueuedStateEvent,
} from "@deepractice-ai/agentx-types";
import type { UserMessage, AgentState } from "@deepractice-ai/agentx-types";
import { isStateEvent } from "@deepractice-ai/agentx-types";
import type { AgentEngine } from "@deepractice-ai/agentx-engine";
import { createLogger } from "@deepractice-ai/agentx-logger";
import { AgentStateMachine } from "./AgentStateMachine";
import { AgentEventBus } from "./AgentEventBus";
import { AgentErrorClassifier } from "./AgentErrorClassifier";
import { MiddlewareChain } from "./MiddlewareChain";
import { InterceptorChain } from "./InterceptorChain";
import { mapReactHandlers } from "./ReactHandlerMapper";

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
   * Driver instance - created from definition.driver class
   */
  private readonly driver: AgentDriver;

  /**
   * State machine - manages state transitions driven by StateEvents
   */
  private readonly stateMachine = new AgentStateMachine();

  /**
   * Event bus - centralized event pub/sub
   */
  private readonly eventBus = new AgentEventBus();

  /**
   * Error classifier - classifies and creates error events
   */
  private readonly errorClassifier: AgentErrorClassifier;

  /**
   * Middleware chain for receive() interception
   */
  private readonly middlewareChain = new MiddlewareChain();

  /**
   * Interceptor chain for event dispatch interception
   */
  private readonly interceptorChain: InterceptorChain;

  /**
   * Lifecycle handlers for onReady
   */
  private readonly readyHandlers: Set<() => void> = new Set();

  /**
   * Lifecycle handlers for onDestroy
   */
  private readonly destroyHandlers: Set<() => void> = new Set();

  constructor(definition: AgentDefinition, context: AgentContext, engine: AgentEngine) {
    this.agentId = context.agentId;
    this.definition = definition;
    this.context = context;
    this.engine = engine;
    this.createdAt = context.createdAt;

    // Instantiate driver from driver class

    this.driver = new definition.driver(context);

    // Initialize components that need agentId
    this.errorClassifier = new AgentErrorClassifier(this.agentId);
    this.interceptorChain = new InterceptorChain(this.agentId);

    logger.debug("AgentInstance created", {
      agentId: this.agentId,
      definitionName: definition.name,
      driverName: this.driver.name,
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
      const error = this.errorClassifier.create(
        "system",
        "AGENT_DESTROYED",
        "Agent has been destroyed",
        false
      );
      const errorEvent = this.errorClassifier.createEvent(error);
      this.notifyHandlers(errorEvent);
      throw new Error("[Agent] Agent has been destroyed");
    }

    const userMessage: UserMessage =
      typeof message === "string"
        ? {
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            role: "user",
            subtype: "user",
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
    await this.middlewareChain.execute(message, (msg) => this.doReceive(msg));
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

      // 0. Emit queued state event - message received, processing about to start
      const queuedEvent: ConversationQueuedStateEvent = {
        type: "conversation_queued",
        uuid: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        agentId: this.agentId,
        timestamp: Date.now(),
        data: {
          userMessage,
        },
      };
      this.notifyHandlers(queuedEvent);

      // 1. Get stream events from driver
      const streamEvents = this.driver.receive(userMessage);

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
      const agentError = this.errorClassifier.classify(error);
      const errorEvent = this.errorClassifier.createEvent(agentError);

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
  on(
    type: "text_content_block_start",
    handler: (event: TextContentBlockStartEvent) => void
  ): Unsubscribe;
  on(type: "text_delta", handler: (event: TextDeltaEvent) => void): Unsubscribe;
  on(
    type: "text_content_block_stop",
    handler: (event: TextContentBlockStopEvent) => void
  ): Unsubscribe;
  on(
    type: "tool_use_content_block_start",
    handler: (event: ToolUseContentBlockStartEvent) => void
  ): Unsubscribe;
  on(type: "input_json_delta", handler: (event: InputJsonDeltaEvent) => void): Unsubscribe;
  on(
    type: "tool_use_content_block_stop",
    handler: (event: ToolUseContentBlockStopEvent) => void
  ): Unsubscribe;
  on(type: "tool_call", handler: (event: ToolCallEvent) => void): Unsubscribe;
  on(type: "tool_result", handler: (event: ToolResultEvent) => void): Unsubscribe;

  // Type-safe overloads for Message Layer Events
  on(type: "user_message", handler: (event: UserMessageEvent) => void): Unsubscribe;
  on(type: "assistant_message", handler: (event: AssistantMessageEvent) => void): Unsubscribe;
  on(type: "tool_call_message", handler: (event: ToolCallMessageEvent) => void): Unsubscribe;
  on(type: "tool_result_message", handler: (event: ToolResultMessageEvent) => void): Unsubscribe;
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
      return this.eventBus.onAny(typeOrHandlerOrMap as AgentEventHandler);
    }

    // Overload 2: on(handlers) - batch subscription (object with event handlers)
    if (this.isEventHandlerMap(typeOrHandlerOrMap)) {
      const unsubscribes: Unsubscribe[] = [];

      for (const [eventType, eventHandler] of Object.entries(typeOrHandlerOrMap)) {
        if (eventHandler) {
          unsubscribes.push(this.eventBus.on(eventType, eventHandler as AgentEventHandler));
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

    return this.eventBus.on(types, h);
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
    const eventHandlerMap = mapReactHandlers(handlers);
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
    return this.middlewareChain.use(middleware);
  }

  /**
   * Add interceptor to intercept outgoing events
   */
  intercept(interceptor: AgentInterceptor): Unsubscribe {
    return this.interceptorChain.intercept(interceptor);
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
    this.eventBus.destroy();
    this.readyHandlers.clear();
    this.destroyHandlers.clear();
    this.middlewareChain.clear();
    this.interceptorChain.clear();

    // Destroy driver and cleanup its resources
    try {
      await this.driver.destroy();
    } catch (error) {
      logger.error("Driver destroy error", {
        agentId: this.agentId,
        driverName: this.driver.name,
        error,
      });
    }

    // Clear engine state for this agent
    this.engine.clearState(this.agentId);

    logger.info("Agent destroyed", { agentId: this.agentId });
  }

  /**
   * Notify all registered handlers
   *
   * Flow:
   * 1. StateMachine processes StateEvents (for state transitions)
   * 2. Interceptor chain can modify/filter events
   * 3. EventBus emits to all subscribers
   */
  private notifyHandlers(event: AgentOutput): void {
    // 1. If StateEvent, let StateMachine process it first (before interceptors)
    if (isStateEvent(event)) {
      this.stateMachine.process(event);
    }

    // 2. Run through interceptor chain, then emit to EventBus
    this.executeInterceptorChain(event);
  }

  /**
   * Execute interceptor chain and then emit to EventBus
   */
  private executeInterceptorChain(event: AgentOutput): void {
    this.interceptorChain.execute(event, (e) => this.eventBus.emit(e));
  }

  /**
   * Get the event consumer for external subscriptions
   *
   * Use this to expose event subscription without emit capability.
   */
  getEventConsumer(): EventConsumer {
    return this.eventBus.asConsumer();
  }
}
