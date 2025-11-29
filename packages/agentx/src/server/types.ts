/**
 * Server Types
 *
 * Type definitions for AgentX server module.
 * These are application-level types, not core domain types.
 */

import type { UserMessage, StreamEventType } from "@deepractice-ai/agentx-types";

// ============================================================================
// Transport Types
// ============================================================================

/**
 * Supported transport types
 */
export type TransportType = "sse" | "websocket";

/**
 * Transport connection state
 */
export type ConnectionState = "connecting" | "open" | "closing" | "closed";

/**
 * Transport connection interface
 */
export interface TransportConnection {
  /**
   * Unique connection ID
   */
  readonly connectionId: string;

  /**
   * Associated agent ID
   */
  readonly agentId: string;

  /**
   * Connection state
   */
  readonly state: ConnectionState;

  /**
   * Send a Stream event to the client
   */
  send(event: StreamEventType): void;

  /**
   * Close the connection
   */
  close(): void;

  /**
   * Register close handler
   */
  onClose(handler: () => void): void;
}

// ============================================================================
// Handler Types
// ============================================================================

/**
 * AgentX Handler - Framework-agnostic request handler
 *
 * Based on Web Standards (Request/Response).
 * Can be adapted to any framework.
 */
export interface AgentXHandler {
  /**
   * Handle a web request
   */
  (request: Request): Promise<Response>;
}

/**
 * Handler options
 */
export interface AgentXHandlerOptions {
  /**
   * Transport type (default: "sse")
   */
  transport?: TransportType;

  /**
   * Base path prefix (default: "")
   */
  basePath?: string;

  /**
   * Allow dynamic agent creation via API (default: false)
   */
  allowDynamicCreation?: boolean;

  /**
   * Allowed definition names for dynamic creation
   */
  allowedDefinitions?: string[];

  /**
   * CORS configuration
   */
  cors?: CorsOptions;

  /**
   * Lifecycle hooks
   */
  hooks?: AgentXHandlerHooks;
}

/**
 * CORS options
 */
export interface CorsOptions {
  /**
   * Allowed origins
   */
  origin?: string | string[] | boolean;

  /**
   * Allowed methods
   */
  methods?: string[];

  /**
   * Allowed headers
   */
  headers?: string[];

  /**
   * Credentials
   */
  credentials?: boolean;
}

/**
 * Handler lifecycle hooks
 */
export interface AgentXHandlerHooks {
  /**
   * Called when a client connects to an agent's SSE
   */
  onConnect?: (agentId: string, connectionId: string) => void | Promise<void>;

  /**
   * Called when a client disconnects
   */
  onDisconnect?: (agentId: string, connectionId: string) => void | Promise<void>;

  /**
   * Called before processing a message
   */
  onMessage?: (agentId: string, message: UserMessage) => void | Promise<void>;

  /**
   * Called on errors
   */
  onError?: (agentId: string, error: Error) => void | Promise<void>;
}

// ============================================================================
// Request/Response Types
// ============================================================================

/**
 * Parsed request info
 */
export interface ParsedRequest {
  /**
   * Request type
   */
  type: RequestType;

  /**
   * Agent ID (if applicable)
   */
  agentId?: string;

  /**
   * Request body (if applicable)
   */
  body?: unknown;
}

/**
 * Request types
 */
export type RequestType =
  | "platform_info" // GET /info
  | "platform_health" // GET /health
  | "list_agents" // GET /agents
  | "create_agent" // POST /agents
  | "get_agent" // GET /agents/:agentId
  | "delete_agent" // DELETE /agents/:agentId
  | "connect_sse" // GET /agents/:agentId/sse
  | "send_message" // POST /agents/:agentId/messages
  | "interrupt" // POST /agents/:agentId/interrupt
  | "not_found"; // Unknown route

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Platform info response
 */
export interface PlatformInfoResponse {
  platform: "AgentX";
  version: string;
  agentCount: number;
}

/**
 * Health check response
 */
export interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: number;
  agentCount: number;
}

/**
 * Agent list response
 */
export interface AgentListResponse {
  agents: AgentInfoResponse[];
}

/**
 * Agent info response
 */
export interface AgentInfoResponse {
  agentId: string;
  name: string;
  description?: string;
  lifecycle: string;
  state: string;
  createdAt: number;
}

/**
 * Create agent request
 */
export interface CreateAgentRequest {
  /**
   * Definition name (must be registered)
   */
  definition: string;

  /**
   * Agent configuration
   */
  config?: Record<string, unknown>;

  /**
   * Optional agent ID (auto-generated if not provided)
   */
  agentId?: string;
}

/**
 * Create agent response
 */
export interface CreateAgentResponse {
  agentId: string;
  name: string;
  lifecycle: string;
  state: string;
  createdAt: number;
  endpoints: {
    sse: string;
    messages: string;
    interrupt: string;
  };
}

/**
 * Send message request
 */
export interface SendMessageRequest {
  /**
   * Message content (string or UserMessage)
   */
  content: string | UserMessage["content"];
}

/**
 * Send message response
 */
export interface SendMessageResponse {
  status: "processing";
}

/**
 * Interrupt response
 */
export interface InterruptResponse {
  interrupted: boolean;
}

/**
 * Error response
 */
export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

/**
 * Error codes
 */
export type ErrorCode =
  | "AGENT_NOT_FOUND"
  | "AGENT_BUSY"
  | "AGENT_DESTROYED"
  | "INVALID_REQUEST"
  | "DEFINITION_NOT_FOUND"
  | "DYNAMIC_CREATION_DISABLED"
  | "INTERNAL_ERROR";
