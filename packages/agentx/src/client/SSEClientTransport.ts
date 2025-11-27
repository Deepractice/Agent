/**
 * SSEClientTransport - Client-side SSE transport
 *
 * Connects to server SSE endpoint and emits stream events.
 */

import type { StreamEventType } from "@deepractice-ai/agentx-types";
import type { ConnectionState, ReconnectOptions } from "./types";

/**
 * SSE event handler
 */
export type SSEEventHandler = (event: StreamEventType) => void;

/**
 * SSE connection state handler
 */
export type SSEStateHandler = (state: ConnectionState) => void;

/**
 * SSE Client Transport
 */
export class SSEClientTransport {
  private _url: string;
  private _reconnectOptions: Required<ReconnectOptions>;
  private _eventSource: EventSource | null = null;
  private _state: ConnectionState = "disconnected";
  private _eventHandlers: Set<SSEEventHandler> = new Set();
  private _stateHandlers: Set<SSEStateHandler> = new Set();
  private _reconnectAttempts = 0;
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    url: string,
    _headers: Record<string, string> = {}, // Note: EventSource doesn't support custom headers
    reconnectOptions: ReconnectOptions = {}
  ) {
    this._url = url;
    this._reconnectOptions = {
      enabled: reconnectOptions.enabled ?? true,
      maxAttempts: reconnectOptions.maxAttempts ?? 5,
      delay: reconnectOptions.delay ?? 1000,
      backoff: reconnectOptions.backoff ?? 2,
    };
  }

  /**
   * Current connection state
   */
  get state(): ConnectionState {
    return this._state;
  }

  /**
   * Connect to SSE endpoint
   */
  connect(): void {
    if (this._state === "connected" || this._state === "connecting") {
      return;
    }

    this._setState("connecting");
    this._createEventSource();
  }

  /**
   * Disconnect from SSE endpoint
   */
  disconnect(): void {
    this._clearReconnectTimer();
    this._closeEventSource();
    this._setState("disconnected");
    this._reconnectAttempts = 0;
  }

  /**
   * Reconnect to SSE endpoint
   */
  async reconnect(): Promise<void> {
    this.disconnect();
    this.connect();
  }

  /**
   * Subscribe to stream events
   */
  onEvent(handler: SSEEventHandler): () => void {
    this._eventHandlers.add(handler);
    return () => {
      this._eventHandlers.delete(handler);
    };
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(handler: SSEStateHandler): () => void {
    this._stateHandlers.add(handler);
    return () => {
      this._stateHandlers.delete(handler);
    };
  }

  /**
   * Create EventSource connection
   */
  private _createEventSource(): void {
    try {
      // Note: EventSource doesn't support custom headers natively
      // For auth, you might need to use URL params or cookies
      // Or use a polyfill like eventsource-polyfill
      this._eventSource = new EventSource(this._url);

      this._eventSource.onopen = () => {
        this._setState("connected");
        this._reconnectAttempts = 0;
      };

      this._eventSource.onerror = () => {
        this._handleError();
      };

      // Listen for all event types
      this._setupEventListeners();
    } catch (error) {
      this._handleError();
    }
  }

  /**
   * Setup listeners for all stream event types
   */
  private _setupEventListeners(): void {
    if (!this._eventSource) return;

    const eventTypes = [
      "message_start",
      "message_delta",
      "message_stop",
      "text_content_block_start",
      "text_delta",
      "text_content_block_stop",
      "tool_use_content_block_start",
      "input_json_delta",
      "tool_use_content_block_stop",
      "tool_call",
      "tool_result",
    ];

    for (const eventType of eventTypes) {
      this._eventSource.addEventListener(eventType, (event) => {
        try {
          const messageEvent = event as MessageEvent;
          const data = JSON.parse(messageEvent.data) as StreamEventType;
          this._emitEvent(data);
        } catch {
          // Ignore parse errors
        }
      });
    }

    // Also listen for generic message events (fallback)
    this._eventSource.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as StreamEventType;
        this._emitEvent(data);
      } catch {
        // Ignore parse errors
      }
    };
  }

  /**
   * Handle connection error
   */
  private _handleError(): void {
    this._closeEventSource();

    if (
      this._reconnectOptions.enabled &&
      this._reconnectAttempts < this._reconnectOptions.maxAttempts
    ) {
      this._setState("reconnecting");
      this._scheduleReconnect();
    } else {
      this._setState("error");
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private _scheduleReconnect(): void {
    const delay =
      this._reconnectOptions.delay *
      Math.pow(this._reconnectOptions.backoff, this._reconnectAttempts);

    this._reconnectAttempts++;

    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this._createEventSource();
    }, delay);
  }

  /**
   * Clear reconnect timer
   */
  private _clearReconnectTimer(): void {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
  }

  /**
   * Close EventSource
   */
  private _closeEventSource(): void {
    if (this._eventSource) {
      this._eventSource.close();
      this._eventSource = null;
    }
  }

  /**
   * Set state and notify handlers
   */
  private _setState(state: ConnectionState): void {
    if (this._state === state) return;
    this._state = state;

    for (const handler of this._stateHandlers) {
      try {
        handler(state);
      } catch {
        // Ignore handler errors
      }
    }
  }

  /**
   * Emit event to handlers
   */
  private _emitEvent(event: StreamEventType): void {
    for (const handler of this._eventHandlers) {
      try {
        handler(event);
      } catch {
        // Ignore handler errors
      }
    }
  }
}
