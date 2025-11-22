/**
 * SSEDriver - Browser-side AgentDriver implementation using SSE
 *
 * Sends user messages via HTTP POST and receives StreamEvents via Server-Sent Events.
 * Built with defineDriver for minimal boilerplate.
 *
 * @example
 * ```typescript
 * import { SSEDriver } from "@deepractice-ai/agentx-sdk-browser";
 *
 * const driver = SSEDriver.create({
 *   serverUrl: "http://localhost:5200",
 *   sessionId: "my-session",
 * });
 * ```
 */

import { defineDriver } from "~/defineDriver";
import type { UserMessage } from "@deepractice-ai/agentx-types";
import type { StreamEventType } from "@deepractice-ai/agentx-event";

/**
 * SSEDriver configuration
 */
export interface SSEDriverConfig {
  /**
   * Server base URL
   * @default "http://localhost:5200"
   */
  serverUrl?: string;

  /**
   * Session ID for this client
   */
  sessionId?: string;
}

/**
 * Helper: Build prompt from UserMessage
 */
function buildPrompt(message: UserMessage): string {
  if (typeof message.content === "string") {
    return message.content;
  }

  if (Array.isArray(message.content)) {
    return message.content
      .filter((part) => part.type === "text")
      .map((part) => (part as any).text)
      .join("\n");
  }

  return "";
}

/**
 * Helper: Receive and parse SSE stream
 *
 * IMPORTANT: This must yield events in real-time, not batch them!
 * We use a queue-based approach to bridge EventSource callbacks with async generator.
 */
async function* receiveSSEStream(
  sseUrl: string,
  serverUrl: string
): AsyncIterable<StreamEventType> {
  // Normalize SSE URL: if relative, prepend serverUrl
  const fullSseUrl = sseUrl.startsWith("http") ? sseUrl : `${serverUrl}${sseUrl}`;
  console.log("[SSEDriver] Opening EventSource connection to:", fullSseUrl);

  const eventQueue: StreamEventType[] = [];
  let resolveNext: ((value: IteratorResult<StreamEventType>) => void) | null = null;
  let isDone = false;
  let error: Error | null = null;

  const eventSource = new EventSource(fullSseUrl);

  eventSource.onopen = () => {
    console.log("[SSEDriver] EventSource connection opened");
  };

  eventSource.onmessage = (event) => {
    try {
      const streamEvent = JSON.parse(event.data) as StreamEventType;
      console.log("[SSEDriver] Received event:", streamEvent.type);

      // Add to queue
      eventQueue.push(streamEvent);

      // If someone is waiting, wake them up (but don't remove from queue yet)
      if (resolveNext) {
        const resolve = resolveNext;
        resolveNext = null;
        // Signal that a new event is available (generator loop will yield it)
        resolve({ value: undefined as any, done: false });
      }

      // Check if this is the last event
      // Note: Don't close on message_stop because State Layer events (like conversation_end)
      // may arrive after it. Instead, close on a timeout or explicit end signal.
      // For now, we rely on server closing the connection or a timeout.
      if (streamEvent.type === "message_stop") {
        // Mark as done but don't close EventSource yet
        // Let state events (conversation_end, etc.) come through
        isDone = true;
        // Close after a short delay to allow trailing events
        setTimeout(() => {
          console.log("[SSEDriver] Closing EventSource after message_stop delay");
          eventSource.close();
        }, 500); // 500ms grace period for state events
      }
    } catch (err) {
      console.error("[SSEDriver] Failed to parse SSE event:", err);
      error = err instanceof Error ? err : new Error(String(err));
      eventSource.close();
      if (resolveNext) {
        resolveNext({ value: undefined, done: true });
        resolveNext = null;
      }
    }
  };

  eventSource.onerror = (err) => {
    console.error("[SSEDriver] SSE connection error:", err);
    eventSource.close();
    error = new Error("SSE connection failed");
    isDone = true;
    if (resolveNext) {
      resolveNext({ value: undefined, done: true });
      resolveNext = null;
    }
  };

  // Generator loop: yield events as they arrive
  while (!isDone || eventQueue.length > 0) {
    if (error) {
      throw error;
    }

    if (eventQueue.length > 0) {
      yield eventQueue.shift()!;
    } else if (!isDone) {
      // Wait for next event
      await new Promise<IteratorResult<StreamEventType>>((resolve) => {
        resolveNext = resolve;
      });
    }
  }
}

/**
 * SSEDriver - Built with defineDriver
 *
 * Architecture:
 * 1. User sends message → POST /api/message
 * 2. Server processes with ClaudeAgent
 * 3. Server streams back StreamEvents via SSE
 * 4. Driver yields StreamEvents to AgentEngine
 * 5. AgentEngine assembles Message/State/Turn events automatically
 */
export const SSEDriver = defineDriver<SSEDriverConfig>({
  name: "SSE",

  async *processMessage(message, config) {
    const serverUrl = config.serverUrl || "http://localhost:5200";
    const sessionId = config.sessionId || `session_${Date.now()}`;

    // Normalize input
    const messages =
      Symbol.asyncIterator in Object(message)
        ? (message as AsyncIterable<UserMessage>)
        : (async function* () {
            yield message as UserMessage;
          })();

    // Process each message
    for await (const msg of messages) {
      const prompt = buildPrompt(msg);

      console.log("[SSEDriver] Sending message to server:", prompt.substring(0, 80));

      // Send message via POST
      const response = await fetch(`${serverUrl}/api/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          message: prompt,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      // Get SSE URL from response
      const { sseUrl } = await response.json();

      console.log("[SSEDriver] SSE URL:", sseUrl);

      // Connect to SSE stream (pass serverUrl to build full URL)
      yield* receiveSSEStream(sseUrl, serverUrl);
    }
  },

  onInit: (config) => {
    console.log("[SSEDriver] Initialized with config:", {
      serverUrl: config.serverUrl || "default",
      sessionId: config.sessionId || "auto-generated",
    });
  },

  onDestroy: () => {
    console.log("[SSEDriver] Destroyed");
  },
});
