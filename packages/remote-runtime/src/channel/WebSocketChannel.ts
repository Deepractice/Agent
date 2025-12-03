/**
 * WebSocketChannel - WebSocket implementation of Channel
 *
 * Provides bidirectional communication between client and server Ecosystems.
 *
 * @example
 * ```typescript
 * const channel = new WebSocketChannel({
 *   url: "ws://localhost:5200/agentx/ws",
 *   headers: { Authorization: "Bearer xxx" },
 * });
 *
 * channel.onStateChange((state) => {
 *   console.log("Connection state:", state);
 * });
 *
 * channel.on((event) => {
 *   console.log("Received:", event.type, event.data);
 * });
 *
 * await channel.connect();
 *
 * channel.send({
 *   type: "message_send_request",
 *   timestamp: Date.now(),
 *   data: { content: "Hello" },
 * });
 * ```
 */

import type {
  Channel,
  ChannelState,
  ChannelEventHandler,
  ChannelStateHandler,
  ChannelUnsubscribe,
  AnyEnvironmentEvent,
} from "@agentxjs/types";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("remote-runtime/WebSocketChannel");

/**
 * WebSocketChannel configuration
 */
export interface WebSocketChannelConfig {
  /**
   * WebSocket server URL (e.g., "ws://localhost:5200/agentx/ws")
   */
  url: string;

  /**
   * Optional query parameters for authentication
   * (WebSocket doesn't support custom headers in browser)
   */
  params?: Record<string, string>;

  /**
   * Reconnection options
   */
  reconnect?: {
    /** Enable auto-reconnect (default: true) */
    enabled?: boolean;
    /** Initial delay in ms (default: 1000) */
    delay?: number;
    /** Max delay in ms (default: 30000) */
    maxDelay?: number;
    /** Max attempts (default: Infinity) */
    maxAttempts?: number;
  };
}

/**
 * WebSocketChannel - Bidirectional channel using WebSocket
 */
export class WebSocketChannel implements Channel {
  private ws: WebSocket | null = null;
  private _state: ChannelState = "disconnected";
  private readonly eventHandlers = new Set<ChannelEventHandler>();
  private readonly stateHandlers = new Set<ChannelStateHandler>();

  private readonly url: string;
  private readonly reconnectEnabled: boolean;
  private readonly reconnectDelay: number;
  private readonly reconnectMaxDelay: number;
  private readonly reconnectMaxAttempts: number;

  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;

  constructor(config: WebSocketChannelConfig) {
    // Build URL with query params
    const urlObj = new URL(config.url);
    if (config.params) {
      for (const [key, value] of Object.entries(config.params)) {
        urlObj.searchParams.set(key, value);
      }
    }
    this.url = urlObj.toString();

    // Reconnection config
    const reconnect = config.reconnect ?? {};
    this.reconnectEnabled = reconnect.enabled ?? true;
    this.reconnectDelay = reconnect.delay ?? 1000;
    this.reconnectMaxDelay = reconnect.maxDelay ?? 30000;
    this.reconnectMaxAttempts = reconnect.maxAttempts ?? Infinity;

    logger.debug("WebSocketChannel created", { url: this.url });
  }

  get state(): ChannelState {
    return this._state;
  }

  private setState(state: ChannelState): void {
    if (this._state !== state) {
      this._state = state;
      logger.debug("Channel state changed", { state });
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
    if (this._state === "connected") {
      logger.debug("Already connected");
      return;
    }

    if (this._state === "connecting") {
      logger.debug("Connection in progress");
      return;
    }

    this.intentionalClose = false;
    this.setState("connecting");

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          logger.info("WebSocket connected", { url: this.url });
          this.reconnectAttempts = 0;
          this.setState("connected");
          resolve();
        };

        this.ws.onclose = (event) => {
          logger.info("WebSocket closed", { code: event.code, reason: event.reason });
          this.ws = null;

          if (this._state === "connecting") {
            // Connection failed during initial connect
            this.setState("disconnected");
            reject(new Error(`WebSocket connection failed: ${event.reason || "Unknown reason"}`));
          } else if (!this.intentionalClose && this.reconnectEnabled) {
            // Unexpected close, try to reconnect
            this.scheduleReconnect();
          } else {
            this.setState("disconnected");
          }
        };

        this.ws.onerror = (event) => {
          logger.error("WebSocket error", { event });
          // onclose will be called after onerror
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
      } catch (err) {
        this.setState("disconnected");
        reject(err);
      }
    });
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.clearReconnectTimer();

    if (this.ws) {
      logger.info("Disconnecting WebSocket");
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }

    this.setState("disconnected");
  }

  send(event: AnyEnvironmentEvent): void {
    if (this._state !== "connected" || !this.ws) {
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
    // Immediately notify current state
    handler(this._state);
    return () => {
      this.stateHandlers.delete(handler);
    };
  }

  private handleMessage(data: string): void {
    try {
      const event = JSON.parse(data) as AnyEnvironmentEvent;
      logger.debug("Received event", { type: event.type });

      for (const handler of this.eventHandlers) {
        try {
          handler(event);
        } catch (err) {
          logger.error("Event handler error", { error: err, eventType: event.type });
        }
      }
    } catch (err) {
      logger.error("Failed to parse message", { error: err, data });
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.reconnectMaxAttempts) {
      logger.warn("Max reconnection attempts reached");
      this.setState("disconnected");
      return;
    }

    this.setState("reconnecting");

    // Exponential backoff with jitter
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts) + Math.random() * 1000,
      this.reconnectMaxDelay
    );

    this.reconnectAttempts++;
    logger.info("Scheduling reconnect", { attempt: this.reconnectAttempts, delay });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch((err) => {
        logger.error("Reconnect failed", { error: err });
        // scheduleReconnect will be called by onclose
      });
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

/**
 * Create WebSocket channel
 */
export function createWebSocketChannel(config: WebSocketChannelConfig): Channel {
  return new WebSocketChannel(config);
}
