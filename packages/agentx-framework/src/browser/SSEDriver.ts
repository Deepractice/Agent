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
 * SSEDriver instance state
 */
interface SSEDriverInstance {
  /**
   * Persistent EventSource connection
   */
  eventSource: EventSource | null;

  /**
   * Event queue for bridging EventSource callbacks to async generator
   */
  eventQueue: StreamEventType[];

  /**
   * Resolvers waiting for next event
   */
  pendingResolvers: Array<(value: IteratorResult<StreamEventType>) => void>;

  /**
   * Whether the connection is done
   */
  isDone: boolean;

  /**
   * Connection error if any
   */
  error: Error | null;

  /**
   * Server URL
   */
  serverUrl: string;

  /**
   * Session ID
   */
  sessionId: string;
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
 * Initialize EventSource connection
 */
function initializeEventSource(instance: SSEDriverInstance): void {
  const fullSseUrl = `${instance.serverUrl}/api/sse/${instance.sessionId}`;
  console.log("[SSEDriver] Opening persistent EventSource connection to:", fullSseUrl);

  const eventSource = new EventSource(fullSseUrl);

  eventSource.onopen = () => {
    console.log("[SSEDriver] EventSource connection opened");
  };

  eventSource.onmessage = (event) => {
    try {
      const streamEvent = JSON.parse(event.data) as StreamEventType;
      console.log("[SSEDriver] Received event:", streamEvent.type);

      // Add to queue
      instance.eventQueue.push(streamEvent);

      // Wake up any waiting resolver
      if (instance.pendingResolvers.length > 0) {
        const resolve = instance.pendingResolvers.shift()!;
        resolve({ value: undefined as any, done: false });
      }
    } catch (err) {
      console.error("[SSEDriver] Failed to parse SSE event:", err);
      instance.error = err instanceof Error ? err : new Error(String(err));
      eventSource.close();

      // Wake up all waiting resolvers with error
      while (instance.pendingResolvers.length > 0) {
        const resolve = instance.pendingResolvers.shift()!;
        resolve({ value: undefined, done: true });
      }
    }
  };

  eventSource.onerror = (err) => {
    console.error("[SSEDriver] SSE connection error:", err);
    eventSource.close();
    instance.error = new Error("SSE connection failed");
    instance.isDone = true;

    // Wake up all waiting resolvers
    while (instance.pendingResolvers.length > 0) {
      const resolve = instance.pendingResolvers.shift()!;
      resolve({ value: undefined, done: true });
    }
  };

  instance.eventSource = eventSource;
}

/**
 * Wait for events from the queue until message_stop
 */
async function* waitForEventsUntilMessageStop(
  instance: SSEDriverInstance
): AsyncIterable<StreamEventType> {
  while (true) {
    if (instance.error) {
      throw instance.error;
    }

    // Check if we have events in queue
    if (instance.eventQueue.length > 0) {
      const event = instance.eventQueue.shift()!;
      yield event;

      // Stop when we receive message_stop
      if (event.type === "message_stop") {
        console.log("[SSEDriver] Received message_stop, message complete");
        break;
      }
    } else {
      // Wait for next event
      await new Promise<IteratorResult<StreamEventType>>((resolve) => {
        instance.pendingResolvers.push(resolve);
      });
    }
  }
}

/**
 * SSEDriver - Built with defineDriver
 *
 * Architecture:
 * 1. Persistent EventSource connection established on first message
 * 2. User sends message → POST /api/message (triggers server processing)
 * 3. Server streams back StreamEvents via existing SSE connection
 * 4. Driver yields StreamEvents to AgentEngine from event queue
 * 5. AgentEngine assembles Message/State/Turn events automatically
 *
 * Key improvements:
 * - Single persistent EventSource connection (no reconnects per message)
 * - Event queue bridges EventSource callbacks to async generator
 * - Stateful instance manages connection lifecycle
 */
export const SSEDriver = defineDriver<SSEDriverConfig, SSEDriverInstance>({
  name: "SSE",

  // Create instance state
  createInstance: (config) => {
    const serverUrl = config.serverUrl || "http://localhost:5200";
    const sessionId = config.sessionId || `session_${Date.now()}`;

    return {
      eventSource: null,
      eventQueue: [],
      pendingResolvers: [],
      isDone: false,
      error: null,
      serverUrl,
      sessionId,
    };
  },

  // Initialize persistent EventSource connection
  onInit: (_config, instance) => {
    console.log("[SSEDriver] Initialized with config:", {
      serverUrl: instance.serverUrl,
      sessionId: instance.sessionId,
    });

    // Establish persistent EventSource connection
    initializeEventSource(instance);
  },

  // Process messages (now just POSTs, receives events from shared connection)
  async *processMessage(message, _config, instance) {
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

      // Send message via POST (server will stream events back via existing SSE connection)
      const response = await fetch(`${instance.serverUrl}/api/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: instance.sessionId,
          message: prompt,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      console.log("[SSEDriver] Message sent, waiting for events from queue");

      // Yield events from the shared event queue until message_stop
      yield* waitForEventsUntilMessageStop(instance);
    }
  },

  // Clean up EventSource connection
  onDestroy: (instance) => {
    console.log("[SSEDriver] Destroying, closing EventSource");
    if (instance.eventSource) {
      instance.eventSource.close();
      instance.eventSource = null;
    }
  },
});
