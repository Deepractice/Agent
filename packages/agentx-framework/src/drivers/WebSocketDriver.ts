/**
 * WebSocketDriver - Client-side WebSocket driver
 *
 * Implements AgentDriver interface by:
 * 1. Sending UserMessage to WebSocket server
 * 2. Receiving Stream events from server
 * 3. Yielding them as AsyncIterable
 *
 * Built with defineDriver for minimal boilerplate.
 *
 * @example
 * ```typescript
 * import { WebSocketDriver } from "@deepractice-ai/agentx-framework/drivers";
 *
 * const agent = defineAgent({
 *   name: "WebSocketClient",
 *   driver: WebSocketDriver,
 *   config: defineConfig({
 *     url: { type: "string", required: true },
 *     sessionId: { type: "string", required: true }
 *   })
 * });
 * ```
 */

import type { StreamEventType } from "@deepractice-ai/agentx-event";
import type { UserMessage } from "@deepractice-ai/agentx-types";
import { defineDriver } from "../defineDriver";

export interface WebSocketDriverConfig {
  /**
   * WebSocket URL to connect to
   * @example "ws://localhost:5200/ws"
   */
  url: string;

  /**
   * Session ID for this agent instance
   */
  sessionId: string;

  /**
   * Connection timeout in milliseconds
   * @default 5000
   */
  connectionTimeout?: number;
}

/**
 * Helper: Connect to WebSocket server
 */
async function connectWebSocket(url: string, timeout: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    try {
      const ws = new WebSocket(url);

      const timeoutId = setTimeout(() => {
        reject(new Error("WebSocket connection timeout"));
        ws.close();
      }, timeout);

      ws.onopen = () => {
        clearTimeout(timeoutId);
        console.log(`[WebSocketDriver] Connected to ${url}`);
        resolve(ws);
      };

      ws.onerror = (error) => {
        clearTimeout(timeoutId);
        console.error("[WebSocketDriver] WebSocket error:", error);
        reject(new Error("WebSocket connection error"));
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Helper: Extract first message from single or iterable
 */
async function getFirstMessage(
  messages: UserMessage | AsyncIterable<UserMessage>
): Promise<UserMessage> {
  if (Symbol.asyncIterator in Object(messages)) {
    for await (const msg of messages as AsyncIterable<UserMessage>) {
      return msg;
    }
    throw new Error("[WebSocketDriver] No messages in async iterable");
  }
  return messages as UserMessage;
}

/**
 * Global event queue for persistent WebSocket
 * Maps message ID to event queue
 */
const messageQueues = new Map<string, StreamEventType[]>();
const messageDoneFlags = new Map<string, boolean>();

/**
 * Setup global WebSocket message handler (only once per connection)
 */
function setupGlobalMessageHandler(ws: WebSocket) {
  // Check if handler already attached
  if ((ws as any).__hasGlobalHandler) {
    return;
  }

  ws.addEventListener("message", (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);

      // Only forward Stream Layer events (raw stream events)
      // Message Layer events (assistant_message, etc.) will be assembled locally by AgentMessageAssembler
      const streamLayerEvents = [
        "message_start",
        "message_delta",
        "message_stop",
        "text_content_block_start",
        "text_delta",
        "text_content_block_stop",
        "tool_use_content_block_start",
        "input_json_delta",
        "tool_use_content_block_stop",
        "tool_call", // Complete tool call assembled
        "tool_result", // Tool execution results from Claude SDK
        // State Layer events (for UI state management)
        "stream_start",
        "stream_complete",
        "conversation_start",
        "conversation_responding",
        "conversation_end",
        // Exchange Layer events (critical for multi-turn agentic flows)
        "exchange_response", // Signals entire exchange is complete (including all tool calls)
        // Error messages (critical, must be forwarded)
        "error_message",
      ];

      if (!streamLayerEvents.includes(data.type)) {
        return;
      }

      // Forward stream events - browser's AgentMessageAssembler will assemble them locally
      for (const [messageId, queue] of messageQueues.entries()) {
        queue.push(data as any); // Type cast for flexibility

        // Mark as done ONLY on exchange_response (not message_stop!)
        // In agentic mode, an exchange contains multiple messages (text → tool calls → results → final response)
        // message_stop only marks the end of a single message, not the entire exchange
        if (data.type === "exchange_response" || data.type === "error_message") {
          messageDoneFlags.set(messageId, true);
        }
      }
    } catch (error) {
      console.error("[WebSocketDriver] Failed to parse message:", error);
    }
  });

  (ws as any).__hasGlobalHandler = true;
}

/**
 * Helper: Send message and stream back events
 */
async function* sendAndReceive(
  ws: WebSocket,
  message: UserMessage
): AsyncIterable<StreamEventType> {
  const messageId = message.id;

  // Setup global handler (no-op if already setup)
  setupGlobalMessageHandler(ws);

  // Create queue for this message
  const queue: StreamEventType[] = [];
  messageQueues.set(messageId, queue);
  messageDoneFlags.set(messageId, false);

  try {
    // Send message to server in the format expected by WebSocketServer
    ws.send(JSON.stringify({
      type: "user",
      message: {
        content: message.content,
      },
    }));

    // Yield events as they arrive (including error_message)
    while (!messageDoneFlags.get(messageId)) {
      await new Promise((resolve) => setTimeout(resolve, 10));

      while (queue.length > 0) {
        const event = queue.shift()!;
        yield event;
      }
    }
  } finally {
    // Cleanup
    messageQueues.delete(messageId);
    messageDoneFlags.delete(messageId);
  }
}

/**
 * WebSocketDriver - Built with defineDriver
 *
 * Maintains a persistent WebSocket connection for the entire agent lifecycle.
 * All messages are sent through this single connection.
 */
export const WebSocketDriver = (() => {
  // Persistent WebSocket connection state (per driver instance)
  let persistentWs: WebSocket | null = null;
  let connectionPromise: Promise<WebSocket> | null = null;

  /**
   * Get or create the persistent WebSocket connection
   */
  async function getOrCreateConnection(config: WebSocketDriverConfig): Promise<WebSocket> {
    // If already connected, return existing connection
    if (persistentWs && persistentWs.readyState === WebSocket.OPEN) {
      return persistentWs;
    }

    // If connection is in progress, wait for it
    if (connectionPromise) {
      return connectionPromise;
    }

    // Create new connection
    connectionPromise = connectWebSocket(config.url, config.connectionTimeout ?? 5000);

    try {
      persistentWs = await connectionPromise;
      console.log("[WebSocketDriver] Persistent connection established");
      return persistentWs;
    } finally {
      connectionPromise = null;
    }
  }

  return defineDriver<WebSocketDriverConfig>({
    name: "WebSocket",

    async *sendMessage(message, config) {
      // 1. Extract first message
      const firstMessage = await getFirstMessage(message);

      // 2. Get or create persistent connection
      const ws = await getOrCreateConnection(config);

      // 3. Send message and yield events (connection stays open)
      yield* sendAndReceive(ws, firstMessage);
    },

    onDestroy: () => {
      console.log("[WebSocketDriver] Destroying - closing persistent connection");
      if (persistentWs) {
        persistentWs.close();
        persistentWs = null;
      }
      connectionPromise = null;
    },
  });
})();
