/**
 * SSEDriver - Browser-side driver that connects to remote AgentX server via SSE
 *
 * This driver enables the client to use the full agentx stack (including AgentEngine)
 * by bridging SSE push events to the async generator pull model.
 *
 * @example
 * ```typescript
 * import { createAgent, defineAgent } from "@deepractice-ai/agentx";
 * import { SSEDriver } from "@deepractice-ai/agentx/client";
 *
 * const agent = createAgent(
 *   defineAgent({ name: "RemoteAgent", driver: SSEDriver }),
 *   { serverUrl: "http://localhost:5200/agentx", agentId: "agent_123" }
 * );
 *
 * agent.on((event) => {
 *   // Receives ASSEMBLED events: assistant_message, tool_call_message, tool_result_message, etc.
 *   console.log(event);
 * });
 *
 * await agent.receive("Hello!");
 * ```
 */

import type { AgentDriver, AgentContext, DriverClass, UserMessage, StreamEventType } from "@deepractice-ai/agentx-types";

/**
 * SSEDriver configuration (passed via AgentContext)
 */
export interface SSEDriverConfig {
  /**
   * Server base URL (e.g., "http://localhost:5200/agentx")
   */
  serverUrl: string;

  /**
   * Agent ID on the server
   */
  agentId: string;

  /**
   * Optional request headers (for auth, etc.)
   * Note: EventSource doesn't support custom headers natively.
   * For auth, consider using cookies or URL params.
   */
  headers?: Record<string, string>;
}

/**
 * Stream event types that we listen for
 */
const STREAM_EVENT_TYPES = [
  "message_start",
  "message_delta",
  "message_stop",
  "text_content_block_start",
  "text_delta",
  "text_content_block_stop",
  "tool_use_content_block_start",
  "input_json_delta",
  "tool_use_content_block_stop",
  "tool_call",
  "tool_result",
  "error_message",
] as const;

/**
 * Persistent SSE connection manager
 *
 * Maintains a single SSE connection for the lifetime of the driver.
 * Bridges SSE push model to async generator pull model for each receive() call.
 */
class PersistentSSEConnection {
  private eventSource: EventSource | null = null;
  private messageQueue: StreamEventType[] = [];
  private activeIterators: Set<{
    resolve: (result: IteratorResult<StreamEventType>) => void;
    reject: (error: Error) => void;
  }> = new Set();
  private isDone = false;

  constructor(
    private readonly serverUrl: string,
    private readonly agentId: string
  ) {}

  /**
   * Initialize SSE connection
   */
  connect(): void {
    if (this.eventSource) {
      return; // Already connected
    }

    const sseUrl = `${this.serverUrl}/agents/${this.agentId}/sse`;
    this.eventSource = new EventSource(sseUrl);

    const handleEvent = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as StreamEventType;

        // Notify all active iterators
        if (this.activeIterators.size > 0) {
          const iterator = this.activeIterators.values().next().value;
          if (iterator) {
            this.activeIterators.delete(iterator);
            iterator.resolve({ value: data, done: false });
          }
        } else {
          // Queue event if no iterator is waiting
          this.messageQueue.push(data);
        }
      } catch {
        // Ignore parse errors
      }
    };

    const handleError = () => {
      this.isDone = true;
      this.eventSource?.close();
      this.eventSource = null;

      // Reject all waiting iterators
      for (const iterator of this.activeIterators) {
        iterator.reject(new Error("SSE connection error"));
      }
      this.activeIterators.clear();
    };

    // Listen for all stream event types
    for (const eventType of STREAM_EVENT_TYPES) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.eventSource.addEventListener(eventType, handleEvent as any);
    }

    // Also listen for generic message events (fallback)
    this.eventSource.onmessage = handleEvent;
    this.eventSource.onerror = handleError;
  }

  /**
   * Create an async iterable for a single receive() call
   *
   * This iterator continues until a final message_stop is received (stopReason !== "tool_use").
   * For tool calls, this means it will span multiple message_start/message_stop cycles.
   * The SSE connection itself remains open for future receive() calls.
   */
  createIterator(): AsyncIterable<StreamEventType> {
    const connection = this;

    return {
      [Symbol.asyncIterator]() {
        let lastStopReason: string | null = null;
        let turnComplete = false;

        return {
          async next(): Promise<IteratorResult<StreamEventType>> {
            // Return queued events first
            if (connection.messageQueue.length > 0) {
              const event = connection.messageQueue.shift()!;

              // Track stopReason from message_delta
              if (event.type === "message_delta") {
                lastStopReason = (event.data.delta as any).stopReason || null;
              }

              // Check if turn is complete at message_stop
              // Continue if stopReason is "tool_use", stop otherwise
              if (event.type === "message_stop") {
                if (lastStopReason !== "tool_use") {
                  turnComplete = true;
                }
              }

              return { value: event, done: false };
            }

            // If turn is complete, end iteration (but keep connection open for next receive())
            if (turnComplete) {
              return { done: true, value: undefined as any };
            }

            // If connection died, end iteration
            if (connection.isDone) {
              return { done: true, value: undefined as any };
            }

            // Wait for next event
            return new Promise((resolve, reject) => {
              // Wrap resolve to track stopReason and check for completion
              const wrappedResolve = (result: IteratorResult<StreamEventType>) => {
                if (!result.done) {
                  // Track stopReason from message_delta
                  if (result.value.type === "message_delta") {
                    lastStopReason = (result.value.data.delta as any).stopReason || null;
                  }

                  // Check if turn is complete at message_stop
                  if (result.value.type === "message_stop") {
                    if (lastStopReason !== "tool_use") {
                      turnComplete = true;
                    }
                  }
                }
                resolve(result);
              };

              const iterator = { resolve: wrappedResolve, reject };
              connection.activeIterators.add(iterator);
            });
          },

          async return(): Promise<IteratorResult<StreamEventType>> {
            // Cleanup this iterator (but keep connection alive)
            return { done: true, value: undefined as any };
          },
        };
      },
    };
  }

  /**
   * Close the connection
   */
  close(): void {
    this.isDone = true;

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    // Reject all waiting iterators
    for (const iterator of this.activeIterators) {
      iterator.reject(new Error("Connection closed"));
    }
    this.activeIterators.clear();
    this.messageQueue = [];
  }
}

/**
 * SSEDriver - Connects to remote AgentX server via SSE
 *
 * This driver:
 * 1. Establishes persistent SSE connection on first use
 * 2. Sends messages to server via HTTP POST
 * 3. Yields stream events from the persistent connection
 * 4. Supports multi-turn conversations (tool calls)
 *
 * The SSE connection remains open across multiple receive() calls,
 * enabling proper tool call flows where Claude responds → calls tool → continues responding.
 */
export class SSEDriver implements AgentDriver {
  readonly name = "SSEDriver";
  readonly description = "Browser SSE driver for connecting to remote AgentX server";

  private readonly context: AgentContext<SSEDriverConfig>;
  private connection: PersistentSSEConnection | null = null;

  constructor(context: AgentContext<SSEDriverConfig>) {
    this.context = context;

    if (!context.serverUrl) {
      throw new Error("[SSEDriver] serverUrl is required in context");
    }
    if (!context.agentId) {
      throw new Error("[SSEDriver] agentId is required in context");
    }
  }

  async *receive(message: UserMessage): AsyncIterable<StreamEventType> {
    const { serverUrl, agentId, headers = {} } = this.context;

    // 1. Ensure SSE connection is established
    if (!this.connection) {
      this.connection = new PersistentSSEConnection(serverUrl, agentId);
      this.connection.connect();
    }

    // 2. Send message to server via HTTP POST
    const messageUrl = `${serverUrl}/agents/${agentId}/messages`;
    const response = await fetch(messageUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({
        content: typeof message.content === "string" ? message.content : message.content,
      }),
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      throw new Error(errorBody.error?.message || `HTTP ${response.status}`);
    }

    // 3. Yield events from persistent SSE connection
    // Each receive() call gets its own iterator that completes on message_stop,
    // but the underlying SSE connection stays open for future calls
    yield* this.connection.createIterator();
  }

  async destroy(): Promise<void> {
    // Close the persistent SSE connection
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
  }

  /**
   * Create a configured driver class with custom options
   */
  static withConfig(extraConfig: Partial<SSEDriverConfig>): DriverClass<SSEDriverConfig> {
    return class ConfiguredSSEDriver extends SSEDriver {
      constructor(context: AgentContext<SSEDriverConfig>) {
        const mergedContext = {
          ...context,
          ...extraConfig,
        };
        super(mergedContext);
      }
    };
  }
}
