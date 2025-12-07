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
  AgentOutputCallback,
  Unsubscribe,
  UserMessage,
  MessageQueue,
  StateChangeHandler,
  EventHandlerMap,
  ReactHandlerMap,
  AgentOutput,
  CreateAgentOptions,
  StreamEvent,
} from "@agentxjs/types/agent";
import type { AgentMiddleware, AgentInterceptor } from "@agentxjs/types/agent/internal";
import { MealyMachine } from "./engine/MealyMachine";
import { AgentStateMachine } from "./AgentStateMachine";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("agent/SimpleAgent");

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

  private readonly _messageQueue = new SimpleMessageQueue();

  private readonly driver: CreateAgentOptions["driver"];
  private readonly presenter: CreateAgentOptions["presenter"];
  private readonly machine: MealyMachine;
  private readonly stateMachine: AgentStateMachine;

  private readonly handlers: Set<AgentOutputCallback> = new Set();
  private readonly typeHandlers: Map<string, Set<AgentOutputCallback>> = new Map();
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
    this.machine = new MealyMachine();
    this.stateMachine = new AgentStateMachine();
  }

  get state(): AgentState {
    return this.stateMachine.state;
  }

  async receive(message: string | UserMessage): Promise<void> {
    console.log(
      "[SimpleAgent.receive] CALLED with message:",
      typeof message === "string" ? message : message.content
    );

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

    console.log("[SimpleAgent.receive] Message queued, isProcessing:", this.isProcessing);

    // If already processing, just queue and return a promise that resolves when this message completes
    if (this.isProcessing) {
      return new Promise((resolve, reject) => {
        // Store resolve/reject to call when this message is processed
        (userMessage as any)._resolve = resolve;
        (userMessage as any)._reject = reject;
      });
    }

    // Start processing
    console.log("[SimpleAgent.receive] Starting processQueue");
    await this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    console.log("[SimpleAgent.processQueue] Starting, queue size:", this._messageQueue.length);

    while (!this._messageQueue.isEmpty) {
      const message = this._messageQueue.dequeue();
      if (!message) break;

      console.log("[SimpleAgent.processQueue] Processing message:", message.id);

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
    console.log("[SimpleAgent.processQueue] Finished");
  }

  private async processMessage(message: UserMessage): Promise<void> {
    console.log("[SimpleAgent.processMessage] START, message:", message.id);

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
        console.log("[SimpleAgent.processMessage] Middleware blocked message");
        return;
      }
    }

    console.log("[SimpleAgent.processMessage] Getting driver stream...");
    const driverStream = this.driver.receive(processedMessage);
    console.log("[SimpleAgent.processMessage] Driver stream:", driverStream);

    try {
      console.log("[SimpleAgent.processMessage] Starting for-await loop...");
      for await (const streamEvent of driverStream) {
        this.handleStreamEvent(streamEvent);
      }
      console.log("[SimpleAgent.processMessage] For-await loop completed");
    } catch (error) {
      console.log("[SimpleAgent.processMessage] ERROR:", error);
      // On error, state will be reset by error_occurred StateEvent
      throw error;
    }
    console.log("[SimpleAgent.processMessage] END");
  }

  /**
   * Handle a stream event from the driver (push-based API)
   *
   * This method processes a single StreamEvent through the MealyMachine
   * and emits all resulting outputs to presenter and handlers.
   */
  handleStreamEvent(event: StreamEvent): void {
    logger.info("handleStreamEvent", { type: event.type });

    // Process through MealyMachine to get all outputs
    // (stream + message + state + turn events)
    const outputs = this.machine.process(this.agentId, event);

    logger.info("MealyMachine outputs", {
      count: outputs.length,
      types: outputs.map((o) => o.type),
    });

    // Emit all outputs
    for (const output of outputs) {
      // Let StateMachine process StateEvents first
      this.stateMachine.process(output);

      // Emit output to presenter and handlers
      this.emitOutput(output);
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

  on(handler: AgentOutputCallback): Unsubscribe;
  on(handlers: EventHandlerMap): Unsubscribe;
  on(type: string, handler: AgentOutputCallback): Unsubscribe;
  on(types: string[], handler: AgentOutputCallback): Unsubscribe;
  on(
    typeOrHandler: string | string[] | AgentOutputCallback | EventHandlerMap,
    handler?: AgentOutputCallback
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
    return this.stateMachine.onStateChange(handler);
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
    if (this.state === "idle") {
      return;
    }
    this.driver.interrupt();
    // State will be updated by conversation_interrupted StateEvent from driver
  }

  async destroy(): Promise<void> {
    // If processing, interrupt first
    if (this.state !== "idle") {
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

    // Clear MealyMachine state for this agent
    this.machine.clearState(this.agentId);

    // Reset StateMachine
    this.stateMachine.reset();

    this._messageQueue.clear();
    this.handlers.clear();
    this.typeHandlers.clear();
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
