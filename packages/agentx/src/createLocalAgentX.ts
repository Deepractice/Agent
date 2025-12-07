/**
 * createLocalAgentX - Local mode implementation
 *
 * This file is dynamically imported to enable tree-shaking in browser builds.
 * Contains Node.js specific code (runtime, ws server).
 */

import type { AgentX, LocalConfig } from "@agentxjs/types/agentx";
import type { SystemEvent } from "@agentxjs/types/event";
import type { WebSocket as WS, WebSocketServer as WSS } from "ws";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("agentx/createAgentX");

/**
 * Setup WebSocket connection handler
 */
function setupConnectionHandler(
  ws: WS,
  connections: Set<WS>,
  runtime: { emit: (event: SystemEvent) => void }
) {
  connections.add(ws);
  logger.info("Client connected", { totalConnections: connections.size });

  // Forward client commands to runtime
  ws.on("message", (data: Buffer) => {
    try {
      const event = JSON.parse(data.toString()) as SystemEvent;
      logger.info("Received from client", {
        type: event.type,
        requestId: (event.data as { requestId?: string })?.requestId,
      });
      runtime.emit(event);
    } catch {
      // Ignore parse errors
    }
  });

  ws.on("close", () => {
    connections.delete(ws);
    logger.info("Client disconnected", { totalConnections: connections.size });
  });
}

/**
 * Setup event broadcasting to all connected clients
 */
function setupBroadcasting(
  connections: Set<WS>,
  runtime: { onAny: (handler: (event: SystemEvent & { broadcastable?: boolean }) => void) => void }
) {
  runtime.onAny((event) => {
    // Skip non-broadcastable events (internal events like DriveableEvent)
    if (event.broadcastable === false) {
      return;
    }

    logger.info("Broadcasting to clients", {
      type: event.type,
      category: event.category,
      requestId: (event.data as { requestId?: string })?.requestId,
    });
    const message = JSON.stringify(event);
    for (const ws of connections) {
      if (ws.readyState === 1) {
        // WebSocket.OPEN
        ws.send(message);
      }
    }
  });
}

export async function createLocalAgentX(config: LocalConfig): Promise<AgentX> {
  // Apply logger configuration
  if (config.logger) {
    const { LoggerFactoryImpl, setLoggerFactory } = await import("@agentxjs/common");

    LoggerFactoryImpl.configure({
      defaultLevel: config.logger.level,
      consoleOptions: config.logger.console,
    });

    if (config.logger.factory) {
      setLoggerFactory(config.logger.factory);
    }
  }

  // Dynamic import to avoid bundling runtime in browser
  const { createRuntime, createPersistence } = await import("@agentxjs/runtime");

  // Create persistence from storage config (async)
  const storageConfig = config.storage ?? {};
  const persistence = await createPersistence(
    storageConfig as Parameters<typeof createPersistence>[0]
  );

  const runtime = createRuntime({
    persistence,
    llmProvider: {
      name: "claude",
      provide: () => ({
        apiKey: config.llm?.apiKey ?? "",
        baseUrl: config.llm?.baseUrl,
        model: config.llm?.model,
      }),
    },
  });

  // WebSocket server state
  let peer: WSS | null = null;
  const connections = new Set<WS>();
  let attachedToServer = false;

  // If server is provided, attach WebSocket to it immediately
  if (config.server) {
    const { WebSocketServer } = await import("ws");
    peer = new WebSocketServer({ noServer: true });

    // Handle WebSocket upgrade on the HTTP server
    config.server.on("upgrade", (request, socket, head) => {
      // Only handle /ws path for WebSocket upgrade
      const url = new URL(request.url || "", `http://${request.headers.host}`);
      if (url.pathname === "/ws") {
        peer!.handleUpgrade(request as any, socket as any, head as any, (ws) => {
          peer!.emit("connection", ws, request);
        });
      } else {
        (socket as any).destroy();
      }
    });

    peer.on("connection", (ws: WS) => {
      setupConnectionHandler(ws, connections, runtime);
    });

    setupBroadcasting(connections, runtime);
    attachedToServer = true;
    logger.info("WebSocket attached to existing HTTP server on /ws path");
  }

  return {
    // Core API - delegate to runtime
    request: (type, data, timeout) => runtime.request(type, data, timeout),

    on: (type, handler) => runtime.on(type, handler),

    onCommand: (type, handler) => runtime.onCommand(type, handler),

    emitCommand: (type, data) => runtime.emitCommand(type, data),

    // Server API
    async listen(port: number, host?: string) {
      if (attachedToServer) {
        throw new Error(
          "Cannot listen when attached to existing server. The server should call listen() instead."
        );
      }

      if (peer) {
        throw new Error("Server already listening");
      }

      const { WebSocketServer } = await import("ws");
      peer = new WebSocketServer({ port, host: host ?? "0.0.0.0" });

      peer.on("connection", (ws: WS) => {
        setupConnectionHandler(ws, connections, runtime);
      });

      setupBroadcasting(connections, runtime);
    },

    async close() {
      if (!peer) return;

      for (const ws of connections) {
        ws.close();
      }
      connections.clear();

      // Don't close the server if attached to existing HTTP server
      if (!attachedToServer) {
        await new Promise<void>((resolve) => {
          peer!.close(() => resolve());
        });
      }
      peer = null;
    },

    async dispose() {
      if (peer) {
        for (const ws of connections) {
          ws.close();
        }
        connections.clear();

        // Don't close the server if attached to existing HTTP server
        if (!attachedToServer) {
          await new Promise<void>((resolve) => {
            peer!.close(() => resolve());
          });
        }
        peer = null;
      }
      await runtime.dispose();
    },
  };
}
