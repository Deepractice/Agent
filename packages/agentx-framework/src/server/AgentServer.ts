/**
 * AgentServer - Base interface for server implementations
 *
 * Provides a unified interface for different transport protocols (SSE, WebSocket).
 */

import type { AgentService } from "@deepractice-ai/agentx-core";
import type { IncomingMessage, ServerResponse } from "http";

/**
 * Agent factory function
 */
export type AgentFactory = (sessionId: string) => AgentService | Promise<AgentService>;


/**
 * HTTP request handler function
 */
export type RequestHandler = (req: IncomingMessage, res: ServerResponse) => Promise<void> | void;

/**
 * Base server configuration
 */
export interface AgentServerConfig {
  /**
   * Port to listen on
   * @default 5200
   */
  port?: number;

  /**
   * Host to bind to
   * @default "0.0.0.0"
   */
  host?: string;

  /**
   * Factory function to create agent instances
   */
  createAgent: AgentFactory;

  /**
   * Fallback handler for non-API routes (e.g., static files)
   * Called when no API route matches
   */
  fallbackHandler?: RequestHandler;
}

/**
 * AgentServer interface
 */
export interface AgentServer {
  /**
   * Start the server
   */
  start(): Promise<void>;

  /**
   * Stop the server
   */
  stop(): Promise<void>;

  /**
   * Handle HTTP request (for custom routing)
   */
  handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void>;
}
