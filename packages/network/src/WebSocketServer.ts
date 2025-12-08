/**
 * WebSocket Server implementation of ChannelServer
 */

import type { WebSocket as WS, WebSocketServer as WSS } from "ws";
import type {
  ChannelServer,
  ChannelConnection,
  ChannelServerOptions,
  MinimalHTTPServer,
  Unsubscribe,
} from "@agentxjs/types/network";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("network/WebSocketServer");

/**
 * WebSocket connection implementation
 */
class WebSocketConnection implements ChannelConnection {
  public readonly id: string;
  private ws: WS;
  private messageHandlers = new Set<(message: string) => void>();
  private closeHandlers = new Set<() => void>();
  private errorHandlers = new Set<(error: Error) => void>();
  private heartbeatInterval?: ReturnType<typeof setInterval>;
  private isAlive = true;

  constructor(ws: WS, options: ChannelServerOptions) {
    this.ws = ws;
    this.id = `conn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Setup heartbeat if enabled
    if (options.heartbeat !== false) {
      const interval = options.heartbeatInterval || 30000;

      ws.on("pong", () => {
        this.isAlive = true;
        logger.debug("Heartbeat pong received", { id: this.id });
      });

      this.heartbeatInterval = setInterval(() => {
        if (!this.isAlive) {
          logger.warn("Client heartbeat timeout, terminating connection", { id: this.id });
          clearInterval(this.heartbeatInterval);
          ws.terminate();
          return;
        }
        this.isAlive = false;
        ws.ping();
        logger.debug("Heartbeat ping sent", { id: this.id });
      }, interval);
    }

    // Setup message handler
    ws.on("message", (data: Buffer) => {
      const message = data.toString();
      for (const handler of this.messageHandlers) {
        handler(message);
      }
    });

    // Setup close handler
    ws.on("close", () => {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }
      for (const handler of this.closeHandlers) {
        handler();
      }
    });

    // Setup error handler
    ws.on("error", (err: Error) => {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }
      for (const handler of this.errorHandlers) {
        handler(err);
      }
    });
  }

  send(message: string): void {
    if (this.ws.readyState === 1) {
      // WebSocket.OPEN
      this.ws.send(message);
    }
  }

  onMessage(handler: (message: string) => void): Unsubscribe {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  onClose(handler: () => void): Unsubscribe {
    this.closeHandlers.add(handler);
    return () => {
      this.closeHandlers.delete(handler);
    };
  }

  onError(handler: (error: Error) => void): Unsubscribe {
    this.errorHandlers.add(handler);
    return () => {
      this.errorHandlers.delete(handler);
    };
  }

  close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.ws.close();
  }
}

/**
 * WebSocket Server
 */
export class WebSocketServer implements ChannelServer {
  private wss: WSS | null = null;
  private connections = new Set<WebSocketConnection>();
  private connectionHandlers = new Set<(connection: ChannelConnection) => void>();
  private options: ChannelServerOptions;
  private attachedToServer = false;

  constructor(options: ChannelServerOptions = {}) {
    this.options = options;
  }

  async listen(port: number, host: string = "0.0.0.0"): Promise<void> {
    if (this.wss) {
      throw new Error("Server already listening");
    }
    if (this.attachedToServer) {
      throw new Error(
        "Cannot listen when attached to existing server. The server should call listen() instead."
      );
    }

    const { WebSocketServer: WSS } = await import("ws");
    this.wss = new WSS({ port, host });

    this.wss.on("connection", (ws: WS) => {
      this.handleConnection(ws);
    });

    logger.info("WebSocket server listening", { port, host });
  }

  attach(server: MinimalHTTPServer, path: string = "/ws"): void {
    if (this.wss) {
      throw new Error("Server already initialized");
    }

    import("ws").then(({ WebSocketServer: WSS }) => {
      this.wss = new WSS({ noServer: true });

      // Handle WebSocket upgrade on the HTTP server
      server.on("upgrade", (request, socket, head) => {
        const url = new URL(request.url || "", `http://${request.headers.host}`);
        if (url.pathname === path) {
          this.wss!.handleUpgrade(request as any, socket as any, head as any, (ws: WS) => {
            this.wss!.emit("connection", ws, request);
          });
        } else {
          (socket as any).destroy();
        }
      });

      this.wss.on("connection", (ws: WS) => {
        this.handleConnection(ws);
      });

      this.attachedToServer = true;
      logger.info("WebSocket attached to existing HTTP server", { path });
    });
  }

  private handleConnection(ws: WS): void {
    const connection = new WebSocketConnection(ws, this.options);
    this.connections.add(connection);

    logger.info("Client connected", {
      connectionId: connection.id,
      totalConnections: this.connections.size,
    });

    connection.onClose(() => {
      this.connections.delete(connection);
      logger.info("Client disconnected", {
        connectionId: connection.id,
        totalConnections: this.connections.size,
      });
    });

    // Notify handlers
    for (const handler of this.connectionHandlers) {
      handler(connection);
    }
  }

  onConnection(handler: (connection: ChannelConnection) => void): Unsubscribe {
    this.connectionHandlers.add(handler);
    return () => {
      this.connectionHandlers.delete(handler);
    };
  }

  broadcast(message: string): void {
    for (const connection of this.connections) {
      connection.send(message);
    }
  }

  async close(): Promise<void> {
    if (!this.wss) return;

    for (const connection of this.connections) {
      connection.close();
    }
    this.connections.clear();

    // Don't close the server if attached to existing HTTP server
    if (!this.attachedToServer) {
      await new Promise<void>((resolve) => {
        this.wss!.close(() => resolve());
      });
    }
    this.wss = null;
  }

  async dispose(): Promise<void> {
    await this.close();
    this.connectionHandlers.clear();
  }
}
