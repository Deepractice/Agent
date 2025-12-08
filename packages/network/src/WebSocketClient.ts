/**
 * WebSocket Client implementation of ChannelClient
 */

import type { ChannelClient, ChannelClientOptions, Unsubscribe } from "@agentxjs/types/network";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("network/WebSocketClient");

// Detect browser environment
const isBrowser =
  typeof globalThis !== "undefined" &&
  typeof (globalThis as any).window !== "undefined" &&
  typeof (globalThis as any).window.WebSocket !== "undefined";

/**
 * WebSocket Client (Node.js version - no auto-reconnect)
 */
export class WebSocketClient implements ChannelClient {
  private ws: WebSocket | null = null;
  private serverUrl: string;
  private messageHandlers = new Set<(message: string) => void>();
  private openHandlers = new Set<() => void>();
  private closeHandlers = new Set<() => void>();
  private errorHandlers = new Set<(error: Error) => void>();

  constructor(options: ChannelClientOptions) {
    if (isBrowser) {
      throw new Error(
        "Use createBrowserWebSocketClient() in browser environment for auto-reconnect support"
      );
    }

    this.serverUrl = options.serverUrl;
  }

  get readyState(): "connecting" | "open" | "closing" | "closed" {
    if (!this.ws) return "closed";
    const state = this.ws.readyState;
    if (state === 0) return "connecting";
    if (state === 1) return "open";
    if (state === 2) return "closing";
    return "closed";
  }

  async connect(): Promise<void> {
    if (this.ws) {
      throw new Error("Already connected or connecting");
    }

    const { WebSocket: NodeWebSocket } = await import("ws");
    this.ws = new NodeWebSocket(this.serverUrl) as unknown as WebSocket;

    return new Promise<void>((resolve, reject) => {
      const onOpen = () => {
        logger.info("WebSocket connected", { serverUrl: this.serverUrl });
        for (const handler of this.openHandlers) {
          handler();
        }
        resolve();
      };

      const onError = (err?: Error) => {
        logger.error("WebSocket connection failed", {
          serverUrl: this.serverUrl,
          error: err?.message,
        });
        reject(err || new Error("WebSocket connection failed"));
      };

      (this.ws as any).once("open", onOpen);
      (this.ws as any).once("error", onError);

      // Setup permanent handlers
      (this.ws as any).on("message", (data: Buffer) => {
        const message = data.toString();
        for (const handler of this.messageHandlers) {
          handler(message);
        }
      });

      (this.ws as any).on("close", () => {
        logger.warn("WebSocket closed");
        for (const handler of this.closeHandlers) {
          handler();
        }
      });

      (this.ws as any).on("error", (err: Error) => {
        logger.error("WebSocket error", { error: err.message });
        for (const handler of this.errorHandlers) {
          handler(err);
        }
      });
    });
  }

  send(message: string): void {
    if (!this.ws || this.ws.readyState !== 1) {
      throw new Error("WebSocket is not open");
    }
    this.ws.send(message);
  }

  onMessage(handler: (message: string) => void): Unsubscribe {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  onOpen(handler: () => void): Unsubscribe {
    this.openHandlers.add(handler);
    return () => {
      this.openHandlers.delete(handler);
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
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  dispose(): void {
    this.close();
    this.messageHandlers.clear();
    this.openHandlers.clear();
    this.closeHandlers.clear();
    this.errorHandlers.clear();
  }
}

/**
 * Browser WebSocket Client with auto-reconnect
 */
export class BrowserWebSocketClient implements ChannelClient {
  private ws: WebSocket | null = null;
  private serverUrl: string;
  private options: ChannelClientOptions;
  private messageHandlers = new Set<(message: string) => void>();
  private openHandlers = new Set<() => void>();
  private closeHandlers = new Set<() => void>();
  private errorHandlers = new Set<(error: Error) => void>();

  constructor(options: ChannelClientOptions) {
    if (!isBrowser) {
      throw new Error("BrowserWebSocketClient can only be used in browser environment");
    }

    this.serverUrl = options.serverUrl;
    this.options = {
      autoReconnect: true,
      minReconnectionDelay: 1000,
      maxReconnectionDelay: 10000,
      maxRetries: Infinity,
      connectionTimeout: 4000,
      debug: false,
      ...options,
    };
  }

  get readyState(): "connecting" | "open" | "closing" | "closed" {
    if (!this.ws) return "closed";
    const state = this.ws.readyState;
    if (state === 0) return "connecting";
    if (state === 1) return "open";
    if (state === 2) return "closing";
    return "closed";
  }

  async connect(): Promise<void> {
    if (this.ws) {
      throw new Error("Already connected or connecting");
    }

    if (this.options.autoReconnect) {
      // Use reconnecting-websocket for auto-reconnect
      const ReconnectingWebSocket = (await import("reconnecting-websocket")).default;
      this.ws = new ReconnectingWebSocket(this.serverUrl, [], {
        maxReconnectionDelay: this.options.maxReconnectionDelay,
        minReconnectionDelay: this.options.minReconnectionDelay,
        reconnectionDelayGrowFactor: 1.3,
        connectionTimeout: this.options.connectionTimeout,
        maxRetries: this.options.maxRetries,
        debug: this.options.debug,
      });
    } else {
      // Use native WebSocket
      this.ws = new WebSocket(this.serverUrl);
    }

    return new Promise<void>((resolve, reject) => {
      const onOpen = () => {
        logger.info("WebSocket connected", { serverUrl: this.serverUrl });
        for (const handler of this.openHandlers) {
          handler();
        }
        resolve();
      };

      const onError = (_event: Event) => {
        logger.error("WebSocket connection failed", { serverUrl: this.serverUrl });
        const error = new Error("WebSocket connection failed");
        for (const handler of this.errorHandlers) {
          handler(error);
        }
        reject(error);
      };

      this.ws!.addEventListener("open", onOpen as any, { once: true });
      this.ws!.addEventListener("error", onError as any, { once: true });

      // Setup permanent handlers
      this.ws!.addEventListener("message", ((event: any) => {
        const message = event.data;
        for (const handler of this.messageHandlers) {
          handler(message);
        }
      }) as any);

      this.ws!.addEventListener("close", (() => {
        logger.warn("WebSocket closed, will attempt to reconnect...");
        for (const handler of this.closeHandlers) {
          handler();
        }
      }) as any);

      this.ws!.addEventListener("error", ((_event: Event) => {
        logger.error("WebSocket error");
        const error = new Error("WebSocket error");
        for (const handler of this.errorHandlers) {
          handler(error);
        }
      }) as any);
    });
  }

  send(message: string): void {
    if (!this.ws || this.ws.readyState !== 1) {
      throw new Error("WebSocket is not open");
    }
    this.ws.send(message);
  }

  onMessage(handler: (message: string) => void): Unsubscribe {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  onOpen(handler: () => void): Unsubscribe {
    this.openHandlers.add(handler);
    return () => {
      this.openHandlers.delete(handler);
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
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  dispose(): void {
    this.close();
    this.messageHandlers.clear();
    this.openHandlers.clear();
    this.closeHandlers.clear();
    this.errorHandlers.clear();
  }
}

/**
 * Factory function to create the appropriate WebSocket client
 */
export async function createWebSocketClient(options: ChannelClientOptions): Promise<ChannelClient> {
  if (isBrowser) {
    const client = new BrowserWebSocketClient(options);
    await client.connect();
    return client;
  } else {
    const client = new WebSocketClient(options);
    await client.connect();
    return client;
  }
}
