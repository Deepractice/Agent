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
 * Create a factory function for agent creation
 *
 * Simplifies agent creation by providing a base config and injecting sessionId.
 * Works with any DefinedAgent (created by defineAgent).
 *
 * @param definedAgent - The defined agent (from defineAgent)
 * @param baseConfig - Base configuration for all agent instances (without sessionId)
 * @returns Factory function that injects sessionId and creates agent instances
 *
 * @example
 * ```typescript
 * import { createAgentServer, createAgentFactory } from "@deepractice-ai/agentx-framework/server";
 * import { ClaudeAgent } from "@deepractice-ai/agentx-sdk-claude";
 *
 * const server = createAgentServer({
 *   port: 5200,
 *   createAgent: createAgentFactory(ClaudeAgent, {
 *     apiKey: process.env.ANTHROPIC_API_KEY,
 *     model: "claude-sonnet-4-5-20250929",
 *     cwd: "/workspace",
 *   }),
 * });
 * ```
 */
export function createAgentFactory<TConfig extends Record<string, any>>(
  definedAgent: { create: (config?: TConfig) => AgentService },
  baseConfig: Omit<TConfig, "sessionId">
): AgentFactory {
  return (sessionId: string) => {
    return definedAgent.create({
      ...baseConfig,
      sessionId,
    } as unknown as TConfig);
  };
}

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
