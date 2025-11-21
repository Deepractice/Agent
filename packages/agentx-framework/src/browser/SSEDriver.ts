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
 */
async function* receiveSSEStream(sseUrl: string): AsyncIterable<StreamEventType> {
  return new Promise<AsyncIterable<StreamEventType>>((resolve, reject) => {
    const events: StreamEventType[] = [];
    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      try {
        const streamEvent = JSON.parse(event.data) as StreamEventType;
        console.log("[SSEDriver] Received event:", streamEvent.type);
        events.push(streamEvent);

        // Check if this is the last event
        if (streamEvent.type === "message_stop") {
          eventSource.close();
          resolve(
            (async function* () {
              for (const e of events) {
                yield e;
              }
            })()
          );
        }
      } catch (error) {
        console.error("[SSEDriver] Failed to parse SSE event:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("[SSEDriver] SSE connection error:", error);
      eventSource.close();
      reject(new Error("SSE connection failed"));
    };
  });
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

  async *sendMessage(message, config) {
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

      // Connect to SSE stream
      yield* receiveSSEStream(sseUrl);
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
