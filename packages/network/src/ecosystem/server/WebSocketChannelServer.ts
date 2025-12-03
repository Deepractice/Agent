/**
 * WebSocketChannelServer - Node.js WebSocket server implementation
 *
 * Listens for incoming WebSocket connections and creates Channels for each.
 * Part of the Network layer, serving the Ecosystem layer's real-time communication needs.
 *
 * @example
 * ```typescript
 * const server = createWebSocketChannelServer({ port: 5200 });
 *
 * server.onConnection((channel) => {
 *   channel.on((event) => {
 *     console.log("Received:", event.type);
 *   });
 * });
 *
 * await server.listen();
 * ```
 */

import { WebSocketServer, WebSocket } from "ws";
import type {
  ChannelServer,
  ChannelServerState,
  ConnectionHandler,
  ChannelServerStateHandler,
  Channel,
  ChannelState,
  ChannelEventHandler,
  ChannelStateHandler,
  ChannelUnsubscribe,
  AnyEnvironmentEvent,
} from "@agentxjs/types";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("network/WebSocketChannelServer");

/**
 * WebSocketChannelServer configuration
 */
export interface WebSocketChannelServerConfig {
  /**
   * Port to listen on
   */
  port: number;

  /**
   * Host to bind to (default: "0.0.0.0")
   */
  host?: string;

  /**
   * Path for WebSocket endpoint (default: "/")
   */
  path?: string;
}

/**
 * Server-side Channel implementation wrapping a WebSocket connection
 */
class ServerWebSocketChannel implements Channel {
  private _state: ChannelState = "connected";
  private readonly eventHandlers = new Set<ChannelEventHandler>();
  private readonly stateHandlers = new Set<ChannelStateHandler>();

  constructor(private readonly ws: WebSocket) {
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.ws.on("message", (data) => {
      try {
        const event = JSON.parse(data.toString()) as AnyEnvironmentEvent;
        logger.debug("Received event", { type: event.type });

        for (const handler of this.eventHandlers) {
          try {
            handler(event);
          } catch (err) {
            logger.error("Event handler error", { error: err });
          }
        }
      } catch (err) {
        logger.error("Failed to parse message", { error: err });
      }
    });

    this.ws.on("close", () => {
      logger.debug("WebSocket connection closed");
      this.setState("disconnected");
    });

    this.ws.on("error", (err) => {
      logger.error("WebSocket error", { error: err });
    });
  }

  get state(): ChannelState {
    return this._state;
  }

  private setState(state: ChannelState): void {
    if (this._state !== state) {
      this._state = state;
      for (const handler of this.stateHandlers) {
        try {
          handler(state);
        } catch (err) {
          logger.error("State handler error", { error: err });
        }
      }
    }
  }

  async connect(): Promise<void> {
    // Server-side channel is already connected, this is a no-op
  }

  disconnect(): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.close(1000, "Server disconnect");
    }
    this.setState("disconnected");
  }

  send(event: AnyEnvironmentEvent): void {
    if (this._state !== "connected" || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error(`Cannot send event: channel is ${this._state}`);
    }

    const message = JSON.stringify(event);
    logger.debug("Sending event", { type: event.type });
    this.ws.send(message);
  }

  on(handler: ChannelEventHandler): ChannelUnsubscribe {
    this.eventHandlers.add(handler);
    return () => {
      this.eventHandlers.delete(handler);
    };
  }

  onStateChange(handler: ChannelStateHandler): ChannelUnsubscribe {
    this.stateHandlers.add(handler);
    handler(this._state);
    return () => {
      this.stateHandlers.delete(handler);
    };
  }
}

/**
 * WebSocketChannelServer - WebSocket server that creates Channels
 */
export class WebSocketChannelServer implements ChannelServer {
  private wss: WebSocketServer | null = null;
  private _state: ChannelServerState = "stopped";
  private readonly connectionHandlers = new Set<ConnectionHandler>();
  private readonly stateHandlers = new Set<ChannelServerStateHandler>();
  private readonly activeChannels = new Set<Channel>();

  private readonly port: number;
  private readonly host: string;
  private readonly path: string;

  constructor(config: WebSocketChannelServerConfig) {
    this.port = config.port;
    this.host = config.host ?? "0.0.0.0";
    this.path = config.path ?? "/";

    logger.debug("WebSocketChannelServer created", {
      port: this.port,
      host: this.host,
      path: this.path,
    });
  }

  get state(): ChannelServerState {
    return this._state;
  }

  get channels(): ReadonlyArray<Channel> {
    return Array.from(this.activeChannels);
  }

  private setState(state: ChannelServerState): void {
    if (this._state !== state) {
      this._state = state;
      logger.debug("Server state changed", { state });
      for (const handler of this.stateHandlers) {
        try {
          handler(state);
        } catch (err) {
          logger.error("State handler error", { error: err });
        }
      }
    }
  }

  async listen(): Promise<void> {
    if (this._state === "listening") {
      logger.debug("Already listening");
      return;
    }

    if (this._state === "starting") {
      logger.debug("Server is starting");
      return;
    }

    this.setState("starting");

    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({
          port: this.port,
          host: this.host,
          path: this.path,
        });

        this.wss.on("listening", () => {
          logger.info("WebSocket server listening", {
            port: this.port,
            host: this.host,
            path: this.path,
          });
          this.setState("listening");
          resolve();
        });

        this.wss.on("connection", (ws) => {
          logger.info("New WebSocket connection");

          const channel = new ServerWebSocketChannel(ws);
          this.activeChannels.add(channel);

          // Remove channel when disconnected
          channel.onStateChange((state) => {
            if (state === "disconnected") {
              this.activeChannels.delete(channel);
            }
          });

          // Notify connection handlers
          for (const handler of this.connectionHandlers) {
            try {
              handler(channel);
            } catch (err) {
              logger.error("Connection handler error", { error: err });
            }
          }
        });

        this.wss.on("error", (err) => {
          logger.error("WebSocket server error", { error: err });
          if (this._state === "starting") {
            this.setState("stopped");
            reject(err);
          }
        });
      } catch (err) {
        this.setState("stopped");
        reject(err);
      }
    });
  }

  async close(): Promise<void> {
    if (this._state === "stopped") {
      return;
    }

    this.setState("stopping");

    // Close all active channels
    for (const channel of this.activeChannels) {
      channel.disconnect();
    }
    this.activeChannels.clear();

    // Close server
    if (this.wss) {
      await new Promise<void>((resolve) => {
        this.wss!.close(() => {
          logger.info("WebSocket server closed");
          resolve();
        });
      });
      this.wss = null;
    }

    this.setState("stopped");
  }

  onConnection(handler: ConnectionHandler): ChannelUnsubscribe {
    this.connectionHandlers.add(handler);
    return () => {
      this.connectionHandlers.delete(handler);
    };
  }

  onStateChange(handler: ChannelServerStateHandler): ChannelUnsubscribe {
    this.stateHandlers.add(handler);
    handler(this._state);
    return () => {
      this.stateHandlers.delete(handler);
    };
  }
}

/**
 * Create WebSocket channel server
 */
export function createWebSocketChannelServer(
  config: WebSocketChannelServerConfig
): ChannelServer {
  return new WebSocketChannelServer(config);
}
