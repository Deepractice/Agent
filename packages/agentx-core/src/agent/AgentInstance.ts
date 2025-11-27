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
} from "@deepractice-ai/agentx-types";
import type { UserMessage, AgentState } from "@deepractice-ai/agentx-types";
import type { AgentEngine } from "@deepractice-ai/agentx-engine";

/**
 * AgentInstance - Implementation of Agent interface
 */
export class AgentInstance implements Agent {
  readonly agentId: string;
  readonly definition: AgentDefinition;
  readonly context: AgentContext;
  readonly createdAt: number;

  private _lifecycle: AgentLifecycle = "running";
  private _state: AgentState = "idle";
  private readonly engine: AgentEngine;

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

  constructor(definition: AgentDefinition, context: AgentContext, engine: AgentEngine) {
    this.agentId = context.agentId;
    this.definition = definition;
    this.context = context;
    this.engine = engine;
    this.createdAt = context.createdAt;
  }

  /**
   * Current lifecycle state
   */
  get lifecycle(): AgentLifecycle {
    return this._lifecycle;
  }

  /**
   * Current conversation state
   */
  get state(): AgentState {
    return this._state;
  }

  /**
   * Receive a message from user
   *
   * Coordinates the flow:
   * 1. Driver receives message → produces StreamEvents
   * 2. Engine processes events → produces outputs
   * 3. Presenters handle outputs
   * 4. Handlers receive outputs
   *
   * Error Handling:
   * - Errors are caught and converted to ErrorMessageEvent
   * - Handlers receive the error event before re-throwing
   * - This ensures UI can display errors
   */
  async receive(message: string | UserMessage): Promise<void> {
    if (this._lifecycle === "destroyed") {
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

    this._state = "responding";

    try {
      // 1. Get stream events from driver
      const streamEvents = this.definition.driver.receive(userMessage, this.context);

      // 2. Process each stream event through engine
      for await (const streamEvent of streamEvents) {
        const outputs = this.engine.process(this.agentId, streamEvent);

        // 3. Send outputs to presenters
        for (const output of outputs) {
          this.presentOutput(output);
        }

        // 4. Notify handlers and update state
        for (const output of outputs) {
          this.notifyHandlers(output);
          this.updateStateFromEvent(output);
        }
      }
    } catch (error) {
      // Convert error to AgentError and emit as ErrorMessageEvent
      const agentError = this.classifyError(error);
      const errorEvent = this.createErrorMessageEvent(agentError);

      // Notify handlers so UI can display the error
      this.notifyHandlers(errorEvent);
      this.updateStateFromEvent(errorEvent);

      // Re-throw so caller is aware of the failure
      throw error;
    } finally {
      // Check lifecycle again - might have been destroyed during receive
      if ((this._lifecycle as AgentLifecycle) !== "destroyed") {
        this._state = "idle";
      }
    }
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
        console.error("[Agent] Presenter error:", error);
      }
    }
  }

  /**
   * Subscribe to events
   */
  on(handler: AgentEventHandler): Unsubscribe;
  on(type: string, handler: AgentEventHandler): Unsubscribe;
  on(types: string[], handler: AgentEventHandler): Unsubscribe;
  on(
    typeOrHandler: string | string[] | AgentEventHandler,
    handler?: AgentEventHandler
  ): Unsubscribe {
    // Overload 1: on(handler) - global subscription
    if (typeof typeOrHandler === "function") {
      this.globalHandlers.add(typeOrHandler);
      return () => {
        this.globalHandlers.delete(typeOrHandler);
      };
    }

    // Overload 2 & 3: on(type, handler) or on(types, handler)
    const types = Array.isArray(typeOrHandler) ? typeOrHandler : [typeOrHandler];
    const h = handler!;

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
   * Abort - System/error forced stop
   */
  abort(): void {
    this._state = "idle";
    // TODO: Signal driver to stop
  }

  /**
   * Interrupt - User-initiated stop
   */
  interrupt(): void {
    this._state = "idle";
    // TODO: Signal driver to stop gracefully
  }

  /**
   * Destroy - Clean up resources
   */
  async destroy(): Promise<void> {
    this._lifecycle = "destroyed";
    this._state = "idle";
    this.typedHandlers.clear();
    this.globalHandlers.clear();
    // Clear engine state for this agent
    this.engine.clearState(this.agentId);
  }

  /**
   * Notify all registered handlers
   *
   * Order: typed handlers first (O(1) lookup), then global handlers
   */
  private notifyHandlers(event: AgentOutput): void {
    // 1. Notify type-specific handlers (O(1) lookup by event.type)
    const typeHandlers = this.typedHandlers.get(event.type);
    if (typeHandlers) {
      for (const handler of typeHandlers) {
        try {
          handler(event);
        } catch (error) {
          console.error("[Agent] Handler error:", error);
        }
      }
    }

    // 2. Notify global handlers (receive all events)
    for (const handler of this.globalHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error("[Agent] Handler error:", error);
      }
    }
  }

  /**
   * Update state from event
   */
  private updateStateFromEvent(event: AgentOutput): void {
    if ("type" in event) {
      switch (event.type) {
        case "message_start":
          this._state = "responding";
          break;
        case "message_stop":
          this._state = "idle";
          break;
        case "tool_call":
          this._state = "awaiting_tool_result";
          break;
        case "tool_result":
          this._state = "responding";
          break;
        case "error_message":
          this._state = "idle";
          break;
      }
    }
  }
}
