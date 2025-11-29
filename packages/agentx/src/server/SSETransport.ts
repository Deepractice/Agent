/**
 * SSETransport - Server-Sent Events transport implementation
 *
 * Handles SSE connections for streaming agent events to clients.
 */

import type { Agent, Unsubscribe, StreamEventType } from "@deepractice-ai/agentx-types";
import { isStreamEvent } from "@deepractice-ai/agentx-types";
import type { TransportConnection, ConnectionState } from "./types";
import { createLogger } from "@deepractice-ai/agentx-logger";

const logger = createLogger("agentx/SSETransport");

/**
 * SSE Connection implementation
 */
export class SSEConnection implements TransportConnection {
  readonly connectionId: string;
  readonly agentId: string;

  private _state: ConnectionState = "connecting";
  private _controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  private _encoder = new TextEncoder();
  private _closeHandlers: Array<() => void> = [];
  private _unsubscribe: Unsubscribe | null = null;
  private _heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(connectionId: string, agentId: string) {
    this.connectionId = connectionId;
    this.agentId = agentId;
    logger.debug("SSE connection created", {
      connectionId,
      agentId,
    });
  }

  get state(): ConnectionState {
    return this._state;
  }

  /**
   * Create SSE Response stream
   */
  createResponse(agent: Agent): Response {
    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        this._controller = controller;
        this._state = "open";

        // Subscribe to agent events (only forward Stream events)
        this._unsubscribe = agent.on((event) => {
          if (isStreamEvent(event)) {
            this.send(event);
          }
        });

        // Start heartbeat
        this._heartbeatInterval = setInterval(() => {
          this.sendHeartbeat();
        }, 30000); // 30 seconds
      },
      cancel: () => {
        this.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Disable nginx buffering
      },
    });
  }

  /**
   * Send a Stream event to the client
   */
  send(event: StreamEventType): void {
    if (this._state !== "open" || !this._controller) {
      return;
    }

    try {
      const eventType = event.type;
      const data = JSON.stringify(event);
      const message = `event: ${eventType}\ndata: ${data}\n\n`;
      this._controller.enqueue(this._encoder.encode(message));
    } catch {
      // Connection may have closed
      this.close();
    }
  }

  /**
   * Send heartbeat to keep connection alive
   */
  private sendHeartbeat(): void {
    if (this._state !== "open" || !this._controller) {
      return;
    }

    try {
      const message = `: heartbeat ${Date.now()}\n\n`;
      this._controller.enqueue(this._encoder.encode(message));
    } catch {
      this.close();
    }
  }

  /**
   * Close the connection
   */
  close(): void {
    if (this._state === "closed" || this._state === "closing") {
      return;
    }

    logger.debug("Closing SSE connection", {
      connectionId: this.connectionId,
      agentId: this.agentId,
    });

    this._state = "closing";

    // Stop heartbeat
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval);
      this._heartbeatInterval = null;
    }

    // Unsubscribe from agent events
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }

    // Close stream
    if (this._controller) {
      try {
        this._controller.close();
      } catch {
        // Already closed
      }
      this._controller = null;
    }

    this._state = "closed";

    // Notify close handlers
    for (const handler of this._closeHandlers) {
      try {
        handler();
      } catch {
        // Ignore handler errors
      }
    }
    this._closeHandlers = [];
  }

  /**
   * Register close handler
   */
  onClose(handler: () => void): void {
    if (this._state === "closed") {
      handler();
    } else {
      this._closeHandlers.push(handler);
    }
  }
}

/**
 * SSE Connection Manager
 *
 * Manages all SSE connections for an AgentX handler.
 */
export class SSEConnectionManager {
  private _connections = new Map<string, SSEConnection>();
  private _idCounter = 0;

  /**
   * Create a new SSE connection for an agent
   */
  createConnection(agent: Agent): { connection: SSEConnection; response: Response } {
    const connectionId = `conn_${++this._idCounter}_${Date.now()}`;
    const connection = new SSEConnection(connectionId, agent.agentId);
    const response = connection.createResponse(agent);

    this._connections.set(connectionId, connection);

    connection.onClose(() => {
      this._connections.delete(connectionId);
    });

    return { connection, response };
  }

  /**
   * Get connection by ID
   */
  getConnection(connectionId: string): SSEConnection | undefined {
    return this._connections.get(connectionId);
  }

  /**
   * Get all connections for an agent
   */
  getConnectionsForAgent(agentId: string): SSEConnection[] {
    return Array.from(this._connections.values()).filter((conn) => conn.agentId === agentId);
  }

  /**
   * Close all connections for an agent
   */
  closeConnectionsForAgent(agentId: string): void {
    for (const conn of this.getConnectionsForAgent(agentId)) {
      conn.close();
    }
  }

  /**
   * Close all connections
   */
  closeAll(): void {
    for (const conn of this._connections.values()) {
      conn.close();
    }
    this._connections.clear();
  }

  /**
   * Get active connection count
   */
  get connectionCount(): number {
    return this._connections.size;
  }
}
