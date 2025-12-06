/**
 * createAgent - Factory function to create an AgentEngine
 *
 * Creates a standalone AgentEngine instance with:
 * - Driver: produces StreamEvents
 * - Presenter: consumes AgentOutput
 *
 * AgentEngine is independent of Runtime (Container, Session, Bus).
 * It can be tested in isolation with mock Driver and Presenter.
 */

import type {
  AgentEngine,
  AgentState,
  AgentEventHandler,
  Unsubscribe,
  UserMessage,
  MessageQueue,
  StateChange,
  StateChangeHandler,
  EventHandlerMap,
  ReactHandlerMap,
  AgentOutput,
  CreateAgentOptions,
} from "@agentxjs/types/agent";
import type {
  AgentMiddleware,
  AgentInterceptor,
} from "@agentxjs/types/agent/internal";

/**
 * Generate unique agent ID
 */
function generateAgentId(): string {
  return `agent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Simple MessageQueue implementation
 */
class SimpleMessageQueue implements MessageQueue {
  private queue: UserMessage[] = [];

  get length(): number {
    return this.queue.length;
  }

  get isEmpty(): boolean {
    return this.queue.length === 0;
  }

  enqueue(message: UserMessage): void {
    this.queue.push(message);
  }

  dequeue(): UserMessage | undefined {
    return this.queue.shift();
  }

  clear(): void {
    this.queue = [];
  }
}

/**
 * SimpleAgent - Minimal AgentEngine implementation
 */
class SimpleAgent implements AgentEngine {
  readonly agentId: string;
  readonly createdAt: number;
  readonly messageQueue: MessageQueue;

  private _state: AgentState = "idle";
  private readonly _messageQueue = new SimpleMessageQueue();

  private readonly driver: CreateAgentOptions["driver"];
  private readonly presenter: CreateAgentOptions["presenter"];

  private readonly handlers: Set<AgentEventHandler> = new Set();
  private readonly typeHandlers: Map<string, Set<AgentEventHandler>> = new Map();
  private readonly stateChangeHandlers: Set<StateChangeHandler> = new Set();
  private readonly readyHandlers: Set<() => void> = new Set();
  private readonly destroyHandlers: Set<() => void> = new Set();
  private readonly middlewares: AgentMiddleware[] = [];
  private readonly interceptors: AgentInterceptor[] = [];

  private isProcessing = false;

  constructor(options: CreateAgentOptions) {
    this.agentId = generateAgentId();
    this.createdAt = Date.now();
    this.messageQueue = this._messageQueue;
    this.driver = options.driver;
    this.presenter = options.presenter;
  }

  get state(): AgentState {
    return this._state;
  }

  private setState(newState: AgentState): void {
    if (newState !== this._state) {
      const prev = this._state;
      this._state = newState;
      const change: StateChange = { prev, current: newState };
      for (const handler of this.stateChangeHandlers) {
        try {
          handler(change);
        } catch (e) {
          console.error("State change handler error:", e);
        }
      }
    }
  }

  async receive(message: string | UserMessage): Promise<void> {
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

    // Queue the message
    this._messageQueue.enqueue(userMessage);

    // If already processing, just queue and return a promise that resolves when this message completes
    if (this.isProcessing) {
      return new Promise((resolve, reject) => {
        // Store resolve/reject to call when this message is processed
        (userMessage as any)._resolve = resolve;
        (userMessage as any)._reject = reject;
      });
    }

    // Start processing
    await this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (!this._messageQueue.isEmpty) {
      const message = this._messageQueue.dequeue();
      if (!message) break;

      try {
        await this.processMessage(message);
        // Resolve the promise if exists
        if ((message as any)._resolve) {
          (message as any)._resolve();
        }
      } catch (error) {
        // Reject the promise if exists
        if ((message as any)._reject) {
          (message as any)._reject(error);
        }
        throw error;
      }
    }

    this.isProcessing = false;
  }

  private async processMessage(message: UserMessage): Promise<void> {
    // Run through middleware chain
    let processedMessage = message;
    for (const middleware of this.middlewares) {
      let nextCalled = false;
      await middleware(processedMessage, async (msg) => {
        nextCalled = true;
        processedMessage = msg;
      });
      if (!nextCalled) {
        // Middleware blocked the message
        return;
      }
    }

    // Process with driver
    this.setState("thinking");

    try {
      for await (const event of this.driver.receive(processedMessage)) {
        // Update state based on event type
        if (event.type === "text_delta") {
          this.setState("responding");
        } else if (event.type === "tool_use_start") {
          this.setState("planning_tool");
        } else if (event.type === "tool_use_stop") {
          // Tool call complete, waiting for tool result
          this.setState("awaiting_tool_result");
        } else if (event.type === "tool_result") {
          // Tool result received, back to thinking
          this.setState("thinking");
        }

        // Emit event
        this.emitOutput(event);
      }
    } finally {
      this.setState("idle");
    }
  }

  private emitOutput(output: AgentOutput): void {
    // Run through interceptor chain
    let currentOutput: AgentOutput | null = output;

    const runInterceptor = (index: number, out: AgentOutput): void => {
      if (index >= this.interceptors.length) {
        currentOutput = out;
        return;
      }
      this.interceptors[index](out, (nextOut) => {
        runInterceptor(index + 1, nextOut);
      });
    };

    runInterceptor(0, output);

    if (!currentOutput) return;

    // Send to presenter
    this.presenter.present(this.agentId, currentOutput);

    // Notify handlers
    for (const handler of this.handlers) {
      try {
        handler(currentOutput);
      } catch (e) {
        console.error("Event handler error:", e);
      }
    }

    // Notify type-specific handlers
    const typeSet = this.typeHandlers.get(currentOutput.type);
    if (typeSet) {
      for (const handler of typeSet) {
        try {
          handler(currentOutput);
        } catch (e) {
          console.error("Event handler error:", e);
        }
      }
    }
  }

  on(handler: AgentEventHandler): Unsubscribe;
  on(handlers: EventHandlerMap): Unsubscribe;
  on(type: string, handler: AgentEventHandler): Unsubscribe;
  on(types: string[], handler: AgentEventHandler): Unsubscribe;
  on(
    typeOrHandler: string | string[] | AgentEventHandler | EventHandlerMap,
    handler?: AgentEventHandler
  ): Unsubscribe {
    // on(handler) - subscribe to all
    if (typeof typeOrHandler === "function") {
      this.handlers.add(typeOrHandler);
      return () => this.handlers.delete(typeOrHandler);
    }

    // on(handlers: EventHandlerMap)
    if (typeof typeOrHandler === "object" && !Array.isArray(typeOrHandler)) {
      const unsubscribes: Unsubscribe[] = [];
      for (const [type, h] of Object.entries(typeOrHandler)) {
        if (h) {
          unsubscribes.push(this.on(type, h));
        }
      }
      return () => unsubscribes.forEach((u) => u());
    }

    // on(type, handler) or on(types, handler)
    const types = Array.isArray(typeOrHandler) ? typeOrHandler : [typeOrHandler];
    const h = handler!;

    for (const type of types) {
      if (!this.typeHandlers.has(type)) {
        this.typeHandlers.set(type, new Set());
      }
      this.typeHandlers.get(type)!.add(h);
    }

    return () => {
      for (const type of types) {
        this.typeHandlers.get(type)?.delete(h);
      }
    };
  }

  onStateChange(handler: StateChangeHandler): Unsubscribe {
    this.stateChangeHandlers.add(handler);
    return () => this.stateChangeHandlers.delete(handler);
  }

  react(handlers: ReactHandlerMap): Unsubscribe {
    // Convert onXxx to event types
    const eventHandlerMap: EventHandlerMap = {};
    for (const [key, handler] of Object.entries(handlers)) {
      if (handler && key.startsWith("on")) {
        // onTextDelta -> text_delta
        const eventType = key
          .slice(2)
          .replace(/([A-Z])/g, "_$1")
          .toLowerCase()
          .slice(1);
        eventHandlerMap[eventType] = handler;
      }
    }
    return this.on(eventHandlerMap);
  }

  onReady(handler: () => void): Unsubscribe {
    // Call immediately since agent is ready upon creation
    try {
      handler();
    } catch (e) {
      console.error("onReady handler error:", e);
    }
    this.readyHandlers.add(handler);
    return () => this.readyHandlers.delete(handler);
  }

  onDestroy(handler: () => void): Unsubscribe {
    this.destroyHandlers.add(handler);
    return () => this.destroyHandlers.delete(handler);
  }

  use(middleware: AgentMiddleware): Unsubscribe {
    this.middlewares.push(middleware);
    return () => {
      const index = this.middlewares.indexOf(middleware);
      if (index >= 0) {
        this.middlewares.splice(index, 1);
      }
    };
  }

  intercept(interceptor: AgentInterceptor): Unsubscribe {
    this.interceptors.push(interceptor);
    return () => {
      const index = this.interceptors.indexOf(interceptor);
      if (index >= 0) {
        this.interceptors.splice(index, 1);
      }
    };
  }

  interrupt(): void {
    if (this._state === "idle") {
      return;
    }
    this.driver.interrupt();
    this.setState("idle");
  }

  async destroy(): Promise<void> {
    // If processing, interrupt first
    if (this._state !== "idle") {
      this.interrupt();
    }

    // Notify destroy handlers
    for (const handler of this.destroyHandlers) {
      try {
        handler();
      } catch (e) {
        console.error("onDestroy handler error:", e);
      }
    }

    this._messageQueue.clear();
    this.handlers.clear();
    this.typeHandlers.clear();
    this.stateChangeHandlers.clear();
    this.readyHandlers.clear();
    this.destroyHandlers.clear();
    this.middlewares.length = 0;
    this.interceptors.length = 0;
  }
}

/**
 * Create an AgentEngine instance
 */
export function createAgent(options: CreateAgentOptions): AgentEngine {
  return new SimpleAgent(options);
}
