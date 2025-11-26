/**
 * SSERequest - Native SSE implementation without dependencies
 *
 * Wraps a single HTTP ServerResponse for SSE streaming.
 * One SSE Connection may have multiple SSE Requests (on reconnect).
 *
 * Hierarchy:
 * - Agent Session (1 user session)
 *   - SSE Connection (1 persistent connection, may reconnect)
 *     - SSE Request (1 HTTP Response, created on each connect)
 */

import type { ServerResponse } from "http";
import { createLogger } from "@deepractice-ai/agentx-logger";

const logger = createLogger("SSERequest");

export interface SSERequestConfig {
  /**
   * Response object
   */
  res: ServerResponse;

  /**
   * Optional headers to add
   */
  headers?: Record<string, string>;
}

/**
 * SSE Request - wraps a single HTTP Response for SSE streaming
 */
export class SSERequest {
  private res: ServerResponse;
  private _isConnected: boolean = false;
  private eventId: number = 0;

  constructor(config: SSERequestConfig) {
    this.res = config.res;

    // Set SSE headers
    const headers = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      ...config.headers,
    };

    this.res.writeHead(200, headers);

    // CRITICAL: EventSource spec requires headers + initial data to trigger onopen
    // Send a comment first (this is optional but helps with proxies)
    this.res.write(":ok\n\n");

    this._isConnected = true;

    logger.debug("SSE session created", { isConnected: this._isConnected });

    // Handle client disconnect
    this.res.on("close", () => {
      logger.info("SSE client disconnected");
      this._isConnected = false;
    });

    this.res.on("error", (error) => {
      logger.error("SSE response error", { error });
      this._isConnected = false;
    });
  }

  /**
   * Check if session is still connected
   */
  get isConnected(): boolean {
    return this._isConnected && !this.res.writableEnded;
  }

  /**
   * Push event to client
   *
   * @param data - Event data (will be JSON.stringify'd)
   * @param eventType - Optional event type (NOT USED - kept for API compatibility)
   *
   * Note: We intentionally do NOT send "event: ..." field because:
   * - EventSource.onmessage only fires for unnamed events
   * - Named events require addEventListener('eventName', handler)
   * - The event type is already in the JSON data payload
   */
  push(data: any, eventType?: string): void {
    if (!this.isConnected) {
      logger.warn("Cannot push - session disconnected");
      return;
    }

    try {
      this.eventId++;

      // Build SSE message (unnamed event format)
      let message = "";

      // Add event ID
      message += `id: ${this.eventId}\n`;

      // IMPORTANT: Do NOT add "event: ..." field here
      // SSEDriver uses onmessage which only fires for unnamed events

      // Add data (JSON.stringify)
      const jsonData = JSON.stringify(data);
      message += `data: ${jsonData}\n\n`;

      // Write to response
      const written = this.res.write(message);

      if (!written) {
        logger.warn("Response buffer full, data queued");
      }

      logger.debug("Event pushed", {
        eventId: this.eventId,
        eventType,
        dataLength: jsonData.length,
        written,
      });
    } catch (error) {
      logger.error("Failed to push event", { error });
    }
  }

  /**
   * Close the session
   */
  close(): void {
    if (this._isConnected) {
      logger.info("Closing SSE session");
      this._isConnected = false;
      this.res.end();
    }
  }
}

/**
 * Create an SSE request
 */
export function createSSERequest(config: SSERequestConfig): SSERequest {
  return new SSERequest(config);
}
