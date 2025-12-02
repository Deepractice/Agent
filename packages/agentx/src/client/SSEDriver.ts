/* eslint-disable no-undef */
/**
 * SSEDriver - Browser-side driver that connects to remote AgentX server via SSE
 *
 * This driver enables the client to use the full agentx stack (including AgentEngine)
 * by bridging SSE push events to the async generator pull model.
 *
 * @example
 * ```typescript
 * import { createSSERuntime } from "@deepractice-ai/agentx/client";
 * import { createAgentX, defineAgent } from "@deepractice-ai/agentx";
 *
 * const runtime = createSSERuntime({
 *   serverUrl: "http://localhost:5200/agentx",
 *   agentId: "agent_123"
 * });
 * const agentx = createAgentX(runtime);
 * const agent = agentx.agents.create(defineAgent({ name: "Assistant" }));
 *
 * agent.on("assistant_message", (event) => {
 *   console.log(event.data.content);
 * });
 *
 * await agent.receive("Hello!");
 * ```
 */

import type { UserMessage, StreamEventType, AgentDriver } from "@deepractice-ai/agentx-types";
import { STREAM_EVENT_TYPE_NAMES } from "@deepractice-ai/agentx-types";

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
    private readonly agentId: string,
    private readonly sseParams: Record<string, string> = {}
  ) {}

  /**
   * Initialize SSE connection
   */
  connect(): void {
    if (this.eventSource) {
      return; // Already connected
    }

    // Build SSE URL with optional query parameters (for auth, etc.)
    let sseUrl = `${this.serverUrl}/agents/${this.agentId}/sse`;
    if (Object.keys(this.sseParams).length > 0) {
      const params = new URLSearchParams(this.sseParams);
      sseUrl += `?${params.toString()}`;
    }
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
    for (const eventType of STREAM_EVENT_TYPE_NAMES) {
      this.eventSource.addEventListener(eventType, handleEvent as any);
    }

    // Listen for error events (independent from stream events, transportable via SSE)
    this.eventSource.addEventListener("error", handleEvent as any);

    // Also listen for generic message events (fallback)
    this.eventSource.onmessage = handleEvent;

    // Handle SSE connection errors (different from our ErrorEvent)
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
        let turnComplete = false;

        return {
          async next(): Promise<IteratorResult<StreamEventType>> {
            // Return queued events first
            if (connection.messageQueue.length > 0) {
              const event = connection.messageQueue.shift()!;

              // Check if turn is complete at message_stop
              // Continue if stopReason is "tool_use", stop otherwise
              if (event.type === "message_stop") {
                const stopReason = event.data.stopReason;
                if (stopReason !== "tool_use") {
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
              // Wrap resolve to check for completion
              const wrappedResolve = (result: IteratorResult<StreamEventType>) => {
                if (!result.done) {
                  // Check if turn is complete at message_stop
                  if (result.value.type === "message_stop") {
                    const stopReason = result.value.data.stopReason;
                    if (stopReason !== "tool_use") {
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
 * SSEDriver configuration
 */
export interface SSEDriverConfig {
  serverUrl: string;
  agentId: string;
  headers?: Record<string, string>;
  /**
   * Query parameters to append to SSE URL.
   * Use this for authentication since EventSource doesn't support headers.
   */
  sseParams?: Record<string, string>;
}

/**
 * Create an SSEDriver instance
 *
 * Factory function for browser-side SSE driver.
 */
export function createSSEDriver(config: SSEDriverConfig): AgentDriver {
  const { serverUrl, agentId, headers = {}, sseParams = {} } = config;
  let connection: PersistentSSEConnection | null = null;

  return {
    name: "SSEDriver",

    async *receive(message: UserMessage): AsyncIterable<StreamEventType> {
      // 1. Ensure SSE connection is established
      if (!connection) {
        connection = new PersistentSSEConnection(serverUrl, agentId, sseParams);
        connection.connect();
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
      yield* connection.createIterator();
    },

    interrupt(): void {
      // Call server interrupt endpoint (fire-and-forget)
      const interruptUrl = `${serverUrl}/agents/${agentId}/interrupt`;
      fetch(interruptUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
      }).catch(() => {
        // Ignore errors - interrupt is best-effort
      });
    },
  };
}
