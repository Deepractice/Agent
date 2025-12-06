/**
 * createAgentX - Factory function for creating AgentX instances
 *
 * Supports two modes:
 * - Local mode: Uses Runtime directly (Claude API)
 * - Remote mode: Connects to AgentX server via WebSocket
 */

import type { AgentX, AgentXConfig, Unsubscribe } from "@agentxjs/types/agentx";
import type {
  CommandEventMap,
  CommandRequestType,
  ResponseEventFor,
  RequestDataFor,
  SystemEvent,
} from "@agentxjs/types/event";
import type { WebSocket as WS, WebSocketServer as WSS } from "ws";

/**
 * Create AgentX instance
 */
export async function createAgentX(config?: AgentXConfig): Promise<AgentX> {
  if (config?.server) {
    return createRemoteAgentX(config.server);
  }
  return createLocalAgentX(config ?? {});
}

// ============================================================================
// Local Mode Implementation
// ============================================================================

async function createLocalAgentX(config: AgentXConfig): Promise<AgentX> {
  // Dynamic import to avoid bundling runtime in browser
  const { createRuntime } = await import("@agentxjs/runtime");
  const { createPersistence } = await import("@agentxjs/persistence");

  const persistence = config.persistence ?? createPersistence();

  const runtime = createRuntime({
    persistence,
    llmProvider: {
      name: "claude",
      provide: () => ({
        apiKey: config.apiKey ?? process.env.ANTHROPIC_API_KEY ?? "",
        model: config.model,
      }),
    },
  });

  // WebSocket server state
  let peer: WSS | null = null;
  const connections = new Set<WS>();

  return {
    // Core API - delegate to runtime
    request: (type, data, timeout) => runtime.request(type, data, timeout),

    on: (type, handler) => runtime.on(type, handler),

    onCommand: (type, handler) => runtime.onCommand(type, handler),

    emitCommand: (type, data) => runtime.emitCommand(type, data),

    // Server API
    async listen(port: number, host?: string) {
      if (peer) {
        throw new Error("Server already listening");
      }

      const { WebSocketServer } = await import("ws");
      peer = new WebSocketServer({ port, host: host ?? "0.0.0.0" });

      peer.on("connection", (ws: WS) => {
        connections.add(ws);

        // Forward client commands to runtime
        ws.on("message", (data: Buffer) => {
          try {
            const event = JSON.parse(data.toString()) as SystemEvent;
            runtime.emit(event);
          } catch {
            // Ignore parse errors
          }
        });

        ws.on("close", () => {
          connections.delete(ws);
        });
      });

      // Forward runtime events to all clients
      runtime.onAny((event) => {
        const message = JSON.stringify(event);
        for (const ws of connections) {
          if (ws.readyState === 1) {
            // WebSocket.OPEN
            ws.send(message);
          }
        }
      });
    },

    async close() {
      if (!peer) return;

      for (const ws of connections) {
        ws.close();
      }
      connections.clear();

      await new Promise<void>((resolve) => {
        peer!.close(() => resolve());
      });
      peer = null;
    },

    async dispose() {
      if (peer) {
        for (const ws of connections) {
          ws.close();
        }
        connections.clear();
        await new Promise<void>((resolve) => {
          peer!.close(() => resolve());
        });
        peer = null;
      }
      await runtime.dispose();
    },
  };
}

// ============================================================================
// Remote Mode Implementation
// ============================================================================

async function createRemoteAgentX(serverUrl: string): Promise<AgentX> {
  const { WebSocket } = await import("ws");

  const ws = new WebSocket(serverUrl);
  const handlers = new Map<string, Set<(event: SystemEvent) => void>>();
  const pendingRequests = new Map<
    string,
    { resolve: (event: SystemEvent) => void; reject: (err: Error) => void; timer: ReturnType<typeof setTimeout> }
  >();

  // Wait for connection
  await new Promise<void>((resolve, reject) => {
    ws.on("open", () => resolve());
    ws.on("error", (err: Error) => reject(err));
  });

  // Handle incoming messages
  ws.on("message", (data: Buffer) => {
    try {
      const event = JSON.parse(data.toString()) as SystemEvent;

      // Check if it's a response to a pending request
      const requestId = (event.data as { requestId?: string })?.requestId;
      if (requestId && pendingRequests.has(requestId)) {
        const pending = pendingRequests.get(requestId)!;
        clearTimeout(pending.timer);
        pendingRequests.delete(requestId);
        pending.resolve(event);
        return;
      }

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

        ws.send(JSON.stringify(event));
      });
    },

    on<T extends string>(type: T, handler: (event: SystemEvent & { type: T }) => void): Unsubscribe {
      return subscribe(type, handler as (event: SystemEvent) => void);
    },

    onCommand<T extends keyof CommandEventMap>(type: T, handler: (event: CommandEventMap[T]) => void): Unsubscribe {
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
      ws.send(JSON.stringify(event));
    },

    async listen() {
      throw new Error("Cannot listen in remote mode");
    },

    async close() {
      // No-op in remote mode
    },

    async dispose() {
      // Clear pending requests
      for (const [, pending] of pendingRequests) {
        clearTimeout(pending.timer);
        pending.reject(new Error("AgentX disposed"));
      }
      pendingRequests.clear();
      handlers.clear();

      ws.close();
    },
  };
}
