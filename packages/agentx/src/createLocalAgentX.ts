/**
 * createLocalAgentX - Local mode implementation
 *
 * This file is dynamically imported to enable tree-shaking in browser builds.
 * Contains Node.js specific code (runtime, WebSocket server).
 */

import type { AgentX, LocalConfig } from "@agentxjs/types/agentx";
import type { SystemEvent } from "@agentxjs/types/event";
import { WebSocketServer } from "@agentxjs/network";

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
  const { homedir } = await import("node:os");
  const { join } = await import("node:path");

  // Determine base path for runtime data
  const basePath = config.agentxDir ?? join(homedir(), ".agentx");

  // Auto-configure storage: SQLite at {agentxDir}/data/agentx.db
  const storagePath = join(basePath, "data", "agentx.db");
  const persistence = await createPersistence({
    driver: "sqlite",
    path: storagePath,
  });

  const runtime = createRuntime({
    persistence,
    basePath,
    llmProvider: {
      name: "claude",
      provide: () => ({
        apiKey: config.llm?.apiKey ?? "",
        baseUrl: config.llm?.baseUrl,
        model: config.llm?.model,
      }),
    },
  });

  // Create WebSocket server
  const wsServer = new WebSocketServer({
    heartbeat: true,
    heartbeatInterval: 30000,
    debug: false,
  });

  // Handle new connections
  wsServer.onConnection((connection) => {
    // Forward client messages to runtime
    connection.onMessage((message) => {
      try {
        const event = JSON.parse(message) as SystemEvent;
        runtime.emit(event);
      } catch {
        // Ignore parse errors
      }
    });
  });

  // Broadcast runtime events to all connected clients
  runtime.onAny((event) => {
    // Skip non-broadcastable events (internal events like DriveableEvent)
    if ((event as any).broadcastable === false) {
      return;
    }
    wsServer.broadcast(JSON.stringify(event));
  });

  // If server is provided, attach WebSocket to it immediately
  if (config.server) {
    wsServer.attach(config.server, "/ws");
  }

  return {
    // Core API - delegate to runtime
    request: (type, data, timeout) => runtime.request(type, data, timeout),

    on: (type, handler) => runtime.on(type, handler),

    onCommand: (type, handler) => runtime.onCommand(type, handler),

    emitCommand: (type, data) => runtime.emitCommand(type, data),

    // Server API
    async listen(port: number, host?: string) {
      if (config.server) {
        throw new Error(
          "Cannot listen when attached to existing server. The server should call listen() instead."
        );
      }
      await wsServer.listen(port, host);
    },

    async close() {
      await wsServer.close();
    },

    async dispose() {
      await wsServer.dispose();
      await runtime.dispose();
    },
  };
}
