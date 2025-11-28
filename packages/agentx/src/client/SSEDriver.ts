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
 * Create an async iterable from SSE connection
 *
 * Bridges SSE push model to async generator pull model.
 * Automatically closes when message_stop is received.
 */
function createSSEEventStream(
  serverUrl: string,
  agentId: string
): AsyncIterable<StreamEventType> {
  return {
    [Symbol.asyncIterator]() {
      const queue: StreamEventType[] = [];
      let resolveNext: ((result: IteratorResult<StreamEventType>) => void) | null = null;
      let rejectNext: ((error: Error) => void) | null = null;
      let isDone = false;
      let eventSource: EventSource | null = null;

      // Create SSE connection
      const sseUrl = `${serverUrl}/agents/${agentId}/sse`;
      eventSource = new EventSource(sseUrl);

      const handleEvent = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data) as StreamEventType;

          if (resolveNext) {
            resolveNext({ value: data, done: false });
            resolveNext = null;
            rejectNext = null;
          } else {
            queue.push(data);
          }

          // Close on message_stop (turn complete)
          if (data.type === "message_stop") {
            isDone = true;
            eventSource?.close();
            eventSource = null;
          }
        } catch {
          // Ignore parse errors
        }
      };

      const handleError = () => {
        isDone = true;
        eventSource?.close();
        eventSource = null;

        if (rejectNext) {
          rejectNext(new Error("SSE connection error"));
          resolveNext = null;
          rejectNext = null;
        }
      };

      // Listen for all stream event types
      for (const eventType of STREAM_EVENT_TYPES) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eventSource.addEventListener(eventType, handleEvent as any);
      }

      // Also listen for generic message events (fallback)
      eventSource.onmessage = handleEvent;
      eventSource.onerror = handleError;

      return {
        async next(): Promise<IteratorResult<StreamEventType>> {
          // Return queued events first
          if (queue.length > 0) {
            return { value: queue.shift()!, done: false };
          }

          // If done, return done
          if (isDone) {
            return { done: true, value: undefined as any };
          }

          // Wait for next event
          return new Promise((resolve, reject) => {
            resolveNext = resolve;
            rejectNext = reject;
          });
        },

        async return(): Promise<IteratorResult<StreamEventType>> {
          // Cleanup on early termination
          isDone = true;
          eventSource?.close();
          eventSource = null;
          return { done: true, value: undefined as any };
        },
      };
    },
  };
}

/**
 * SSEDriver - Connects to remote AgentX server via SSE
 *
 * This driver:
 * 1. Sends messages to server via HTTP POST
 * 2. Receives stream events via SSE
 * 3. Yields events to AgentEngine for assembly
 *
 * Because it uses the standard AgentDriver interface, the client
 * gets full AgentEngine processing (event assembly, state tracking).
 */
export class SSEDriver implements AgentDriver {
  readonly name = "SSEDriver";
  readonly description = "Browser SSE driver for connecting to remote AgentX server";

  private readonly context: AgentContext<SSEDriverConfig>;

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

    // 1. Send message to server via HTTP POST
    const messageUrl = `${serverUrl}/agents/${agentId}/messages`;
    const response = await fetch(messageUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({
        content: typeof message.content === "string"
          ? message.content
          : message.content,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(errorBody.error?.message || `HTTP ${response.status}`);
    }

    // 2. Yield events from SSE stream
    // AgentEngine will process these and produce assembled events
    yield* createSSEEventStream(serverUrl, agentId);
  }

  async destroy(): Promise<void> {
    // No cleanup needed for SSEDriver
  }

  /**
   * Create a configured driver class with custom options
   */
  static withConfig(
    extraConfig: Partial<SSEDriverConfig>
  ): DriverClass<SSEDriverConfig> {
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
