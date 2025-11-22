/**
 * SSEConnectionManager - Manages SSE connections lifecycle
 *
 * Responsibilities:
 * - Track SSE connections per session
 * - Handle SSE reconnection (update SSERequest without recreating Reactor)
 * - Queue pending messages before SSE connects
 * - Coordinate with AgentRegistry for cleanup
 *
 * Lifecycle:
 * - 1 Session : 1 Agent : N SSE Connections (reconnections)
 * - Agent destruction triggers connection cleanup
 * - SSE disconnect does NOT destroy Agent (supports reconnect)
 *
 * @example
 * ```typescript
 * const connectionManager = new SSEConnectionManager();
 *
 * // Create connection when SSE connects
 * connectionManager.create(sessionId, { request: sseRequest });
 *
 * // Update request on reconnect
 * connectionManager.updateRequest(sessionId, newRequest);
 *
 * // Queue message before SSE connects
 * connectionManager.queueMessage(sessionId, "Hello");
 *
 * // Get pending messages and clear queue
 * const pending = connectionManager.flushPendingMessages(sessionId);
 * ```
 */

import type { SSERequest } from "~/server/SSERequest";
import type { SSEReactorConfig } from "~/server/SSEReactor";
import { createLogger, type LoggerProvider } from "@deepractice-ai/agentx-logger";

/**
 * SSE Connection data
 */
export interface SSEConnection {
  /**
   * SSEReactor instance (created via defineReactor)
   */
  reactor: any;

  /**
   * SSEReactor config (contains request container for updates)
   */
  reactorConfig: SSEReactorConfig;

  /**
   * Unsubscribe function from agent.registerReactor()
   */
  unsubscribe: () => void;

  /**
   * Pending messages queued before SSE connected
   */
  pendingMessages: string[];

  /**
   * Connection creation time
   */
  createdAt: Date;

  /**
   * Last activity time
   */
  lastActivityAt: Date;

  /**
   * Whether SSE is currently connected
   */
  isConnected: boolean;
}

/**
 * SSEConnectionManager configuration
 */
export interface SSEConnectionManagerConfig {
  /**
   * Logger instance
   */
  logger?: LoggerProvider;

  /**
   * Callback when connection is destroyed
   */
  onConnectionDestroy?: (sessionId: string) => void | Promise<void>;
}

/**
 * SSEConnectionManager
 *
 * Manages SSE connection lifecycle independent of Agent lifecycle.
 */
export class SSEConnectionManager {
  private readonly connections = new Map<string, SSEConnection>();
  private readonly logger: LoggerProvider;
  private readonly config: SSEConnectionManagerConfig;

  constructor(config: SSEConnectionManagerConfig = {}) {
    this.config = config;
    this.logger = config.logger || createLogger("framework/SSEConnectionManager");
  }

  /**
   * Check if a connection exists for session
   */
  has(sessionId: string): boolean {
    return this.connections.has(sessionId);
  }

  /**
   * Get connection for session
   */
  get(sessionId: string): SSEConnection | undefined {
    return this.connections.get(sessionId);
  }

  /**
   * Create a new SSE connection
   *
   * @param sessionId - Session identifier
   * @param reactor - SSEReactor instance
   * @param reactorConfig - SSEReactor config
   * @param unsubscribe - Unsubscribe function from registerReactor
   * @returns Created connection
   * @throws Error if connection already exists
   */
  create(
    sessionId: string,
    reactor: any,
    reactorConfig: SSEReactorConfig,
    unsubscribe: () => void
  ): SSEConnection {
    if (this.connections.has(sessionId)) {
      throw new Error(`SSE connection already exists: ${sessionId}`);
    }

    const connection: SSEConnection = {
      reactor,
      reactorConfig,
      unsubscribe,
      pendingMessages: [],
      createdAt: new Date(),
      lastActivityAt: new Date(),
      isConnected: true,
    };

    this.connections.set(sessionId, connection);

    this.logger.info("SSE connection created", {
      sessionId,
      totalConnections: this.connections.size,
    });

    return connection;
  }

  /**
   * Create a placeholder connection for queuing messages
   *
   * Used when POST /api/message arrives before GET /api/sse
   */
  createPlaceholder(sessionId: string): SSEConnection {
    if (this.connections.has(sessionId)) {
      return this.connections.get(sessionId)!;
    }

    const connection: SSEConnection = {
      reactor: null as any,
      reactorConfig: null as any,
      unsubscribe: null as any,
      pendingMessages: [],
      createdAt: new Date(),
      lastActivityAt: new Date(),
      isConnected: false,
    };

    this.connections.set(sessionId, connection);

    this.logger.debug("SSE connection placeholder created", { sessionId });

    return connection;
  }

  /**
   * Upgrade placeholder to full connection
   *
   * Called when SSE connects after messages were queued
   */
  upgrade(
    sessionId: string,
    reactor: any,
    reactorConfig: SSEReactorConfig,
    unsubscribe: () => void
  ): SSEConnection {
    const existing = this.connections.get(sessionId);

    if (!existing) {
      // No placeholder, create new
      return this.create(sessionId, reactor, reactorConfig, unsubscribe);
    }

    // Upgrade existing placeholder
    existing.reactor = reactor;
    existing.reactorConfig = reactorConfig;
    existing.unsubscribe = unsubscribe;
    existing.isConnected = true;
    existing.lastActivityAt = new Date();

    this.logger.info("SSE connection upgraded from placeholder", {
      sessionId,
      pendingMessages: existing.pendingMessages.length,
    });

    return existing;
  }

  /**
   * Update SSE request on reconnect
   *
   * Reuses existing Reactor but updates the SSERequest
   */
  updateRequest(sessionId: string, request: SSERequest): boolean {
    const connection = this.connections.get(sessionId);

    if (!connection || !connection.reactorConfig) {
      this.logger.warn("Cannot update request - connection not found or not initialized", {
        sessionId,
      });
      return false;
    }

    // Update request in config container
    if (connection.reactorConfig._requestContainer) {
      connection.reactorConfig._requestContainer.current = request;
      connection.isConnected = true;
      connection.lastActivityAt = new Date();

      this.logger.info("SSE request updated (reconnect)", { sessionId });
      return true;
    }

    this.logger.error("Cannot update request - request container not found", { sessionId });
    return false;
  }

  /**
   * Mark connection as disconnected
   *
   * Does NOT destroy the connection - allows reconnect
   */
  markDisconnected(sessionId: string): void {
    const connection = this.connections.get(sessionId);
    if (connection) {
      connection.isConnected = false;
      this.logger.debug("SSE connection marked disconnected", { sessionId });
    }
  }

  /**
   * Queue a message for later delivery
   */
  queueMessage(sessionId: string, message: string): void {
    let connection = this.connections.get(sessionId);

    if (!connection) {
      // Create placeholder for queuing
      connection = this.createPlaceholder(sessionId);
    }

    connection.pendingMessages.push(message);
    connection.lastActivityAt = new Date();

    this.logger.debug("Message queued", {
      sessionId,
      queueSize: connection.pendingMessages.length,
    });
  }

  /**
   * Flush pending messages (returns and clears queue)
   */
  flushPendingMessages(sessionId: string): string[] {
    const connection = this.connections.get(sessionId);

    if (!connection) {
      return [];
    }

    const messages = [...connection.pendingMessages];
    connection.pendingMessages = [];

    if (messages.length > 0) {
      this.logger.info("Flushing pending messages", {
        sessionId,
        count: messages.length,
      });
    }

    return messages;
  }

  /**
   * Destroy connection and cleanup
   */
  async destroy(sessionId: string): Promise<boolean> {
    const connection = this.connections.get(sessionId);

    if (!connection) {
      return false;
    }

    this.logger.info("Destroying SSE connection", { sessionId });

    // Unsubscribe reactor from agent
    if (connection.unsubscribe) {
      try {
        connection.unsubscribe();
      } catch (error) {
        this.logger.error("Error unsubscribing reactor", {
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Remove from map
    this.connections.delete(sessionId);

    // Call destroy callback
    if (this.config.onConnectionDestroy) {
      try {
        await this.config.onConnectionDestroy(sessionId);
      } catch (error) {
        this.logger.error("Error in onConnectionDestroy callback", {
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.logger.info("SSE connection destroyed", {
      sessionId,
      totalConnections: this.connections.size,
    });

    return true;
  }

  /**
   * Destroy all connections
   */
  async destroyAll(): Promise<number> {
    const sessionIds = Array.from(this.connections.keys());
    let count = 0;

    for (const sessionId of sessionIds) {
      if (await this.destroy(sessionId)) {
        count++;
      }
    }

    this.logger.info("All SSE connections destroyed", { count });

    return count;
  }

  /**
   * Get all session IDs with active connections
   */
  getAllSessionIds(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Get total connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }
}
