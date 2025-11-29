/**
 * Client Types
 *
 * Type definitions for AgentX client module.
 */

// ============================================================================
// Connection Types
// ============================================================================

/**
 * Connection state (for SSE transport)
 */
export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

/**
 * Reconnect options (for SSE transport)
 */
export interface ReconnectOptions {
  /**
   * Enable auto-reconnect (default: true)
   */
  enabled?: boolean;

  /**
   * Maximum reconnect attempts (default: 5)
   */
  maxAttempts?: number;

  /**
   * Base delay between attempts in ms (default: 1000)
   */
  delay?: number;

  /**
   * Delay multiplier for exponential backoff (default: 2)
   */
  backoff?: number;
}

// ============================================================================
// Client Types
// ============================================================================

/**
 * AgentX client options
 */
export interface AgentXClientOptions {
  /**
   * Server base URL
   *
   * @example "http://localhost:3000/agentx"
   */
  baseUrl: string;

  /**
   * Request headers (for auth, etc.)
   */
  headers?: Record<string, string>;

  /**
   * Request timeout in milliseconds (default: 30000)
   */
  timeout?: number;
}

/**
 * Options for connecting to a specific agent
 */
export interface ConnectAgentOptions {
  /**
   * Server base URL
   */
  baseUrl: string;

  /**
   * Agent ID to connect to
   */
  agentId: string;

  /**
   * Request headers
   */
  headers?: Record<string, string>;
}

// ============================================================================
// API Response Types (Client-side)
// ============================================================================

/**
 * Platform info response
 */
export interface PlatformInfo {
  platform: string;
  version: string;
  agentCount: number;
}

/**
 * Health response
 */
export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: number;
  agentCount: number;
}

/**
 * Agent info
 */
export interface AgentInfo {
  agentId: string;
  name: string;
  description?: string;
  lifecycle: string;
  state: string;
  createdAt: number;
}

/**
 * Create agent options
 */
export interface CreateAgentOptions {
  /**
   * Definition name
   */
  definition: string;

  /**
   * Agent configuration
   */
  config?: Record<string, unknown>;
}

/**
 * Created agent response
 */
export interface CreatedAgent {
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
 * API error
 */
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * API error class
 */
export class AgentXApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "AgentXApiError";
  }
}

// ============================================================================
// Remote Agent Types
// ============================================================================

/**
 * Remote Agent interface - extends Agent with connection management
 */
export interface RemoteAgent {
  // Connection management
  readonly serverUrl: string;
  readonly connectionState: ConnectionState;
  connect(): void;
  disconnect(): void;
  reconnect(): Promise<void>;
}
