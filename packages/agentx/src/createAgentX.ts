/**
 * createAgentX - Factory function for creating AgentX instances
 *
 * Supports two modes:
 * - Local mode: Uses Runtime directly (Claude API) - Node.js only
 * - Remote mode: Connects to AgentX server via WebSocket - Browser & Node.js
 *
 * Local mode implementation is dynamically imported to enable tree-shaking
 * in browser builds.
 */

import type { AgentX, AgentXConfig, Unsubscribe } from "@agentxjs/types/agentx";
import { isRemoteConfig } from "@agentxjs/types/agentx";
import type {
  CommandEventMap,
  CommandRequestType,
  ResponseEventFor,
  RequestDataFor,
  SystemEvent,
} from "@agentxjs/types/event";
import { createLogger } from "@agentxjs/common";

const remoteLogger = createLogger("agentx/RemoteClient");

/**
 * Create AgentX instance
 *
 * @param config - Configuration (LocalConfig or RemoteConfig)
 * @returns AgentX instance
 *
 * @example
 * ```typescript
 * // Remote mode (browser & Node.js)
 * const agentx = await createAgentX({ serverUrl: "ws://localhost:5200" });
 *
 * // Local mode (Node.js only)
 * const agentx = await createAgentX({ llm: { apiKey: "sk-..." } });
 * ```
 */
export async function createAgentX(config?: AgentXConfig): Promise<AgentX> {
  if (config && isRemoteConfig(config)) {
    return createRemoteAgentX(config.serverUrl);
  }

  // Dynamic import for tree-shaking in browser builds
  const { createLocalAgentX } = await import("./createLocalAgentX");
  return createLocalAgentX(config ?? {});
}

// ============================================================================
// Remote Mode Implementation (Browser & Node.js compatible)
// ============================================================================

/**
 * Create AgentX instance in remote mode
 *
 * Connects to an AgentX server via WebSocket.
 * Works in both browser and Node.js environments.
 *
 * @param serverUrl - WebSocket server URL
 * @returns AgentX instance
 */
export async function createRemoteAgentX(serverUrl: string): Promise<AgentX> {
  // Use @agentxjs/network for WebSocket client (handles browser/Node.js differences)
  const { createWebSocketClient } = await import("@agentxjs/network");

  const client = await createWebSocketClient({
    serverUrl,
    autoReconnect: true,
    minReconnectionDelay: 1000,
    maxReconnectionDelay: 10000,
    connectionTimeout: 4000,
    maxRetries: Infinity,
    debug: false,
  });

  const handlers = new Map<string, Set<(event: SystemEvent) => void>>();
  const pendingRequests = new Map<
    string,
    {
      resolve: (event: SystemEvent) => void;
      reject: (err: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();

  // Handle incoming messages
  client.onMessage((message: string) => {
    try {
      const event = JSON.parse(message) as SystemEvent;

      remoteLogger.info("Received event", {
        type: event.type,
        category: event.category,
        requestId: (event.data as any)?.requestId,
      });

      // Handle error events - log as error (but still dispatch to handlers)
      if (event.type === "system_error") {
        const errorData = event.data as { message: string; severity?: string; details?: unknown };
        remoteLogger.error(errorData.message, {
          severity: errorData.severity,
          requestId: (event.data as any)?.requestId,
          details: errorData.details,
        });
        // Continue to dispatch to handlers (don't return here)
      }

      // Check if it's a response to a pending request
      const requestId = (event.data as { requestId?: string })?.requestId;
      if (event.category === "response" && requestId && pendingRequests.has(requestId)) {
        remoteLogger.info("Resolving pending request", { requestId, eventType: event.type });
        const pending = pendingRequests.get(requestId)!;
        clearTimeout(pending.timer);
        pendingRequests.delete(requestId);
        pending.resolve(event);
        return;
      }

      remoteLogger.info("Dispatching to handlers", { type: event.type });

      // Dispatch to handlers
      const typeHandlers = handlers.get(event.type);
      if (typeHandlers) {
        for (const handler of typeHandlers) {
          handler(event);
        }
      }

      // Dispatch to "*" handlers
      const allHandlers = handlers.get("*");
      if (allHandlers) {
        for (const handler of allHandlers) {
          handler(event);
        }
      }
    } catch {
      // Ignore parse errors
    }
  });

  // Handle connection events
  client.onClose(() => {
    remoteLogger.warn("WebSocket closed");
  });

  client.onError((error: Error) => {
    remoteLogger.error("WebSocket error", { error: error.message });
  });

  function subscribe(type: string, handler: (event: SystemEvent) => void): Unsubscribe {
    if (!handlers.has(type)) {
      handlers.set(type, new Set());
    }
    handlers.get(type)!.add(handler);
    return () => {
      handlers.get(type)?.delete(handler);
    };
  }

  return {
    request<T extends CommandRequestType>(
      type: T,
      data: RequestDataFor<T>,
      timeout: number = 30000
    ): Promise<ResponseEventFor<T>> {
      return new Promise((resolve, reject) => {
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        const timer = setTimeout(() => {
          pendingRequests.delete(requestId);
          reject(new Error(`Request timeout: ${type}`));
        }, timeout);

        pendingRequests.set(requestId, {
          resolve: resolve as (event: SystemEvent) => void,
          reject,
          timer,
        });

        const event: SystemEvent = {
          type,
          timestamp: Date.now(),
          data: { ...data, requestId },
          source: "command",
          category: "request",
          intent: "request",
        };

        client.send(JSON.stringify(event));
      });
    },

    on<T extends string>(
      type: T,
      handler: (event: SystemEvent & { type: T }) => void
    ): Unsubscribe {
      return subscribe(type, handler as (event: SystemEvent) => void);
    },

    onCommand<T extends keyof CommandEventMap>(
      type: T,
      handler: (event: CommandEventMap[T]) => void
    ): Unsubscribe {
      return subscribe(type, handler as (event: SystemEvent) => void);
    },

    emitCommand<T extends keyof CommandEventMap>(type: T, data: CommandEventMap[T]["data"]): void {
      const event: SystemEvent = {
        type,
        timestamp: Date.now(),
        data,
        source: "command",
        category: type.toString().endsWith("_response") ? "response" : "request",
        intent: type.toString().endsWith("_response") ? "result" : "request",
      };
      client.send(JSON.stringify(event));
    },

    async listen() {
      throw new Error("Cannot listen in remote mode");
    },

    async close() {
      // No-op in remote mode
    },

    async dispose() {
      for (const pending of pendingRequests.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error("AgentX disposed"));
      }
      pendingRequests.clear();
      handlers.clear();
      client.dispose();
    },
  };
}
