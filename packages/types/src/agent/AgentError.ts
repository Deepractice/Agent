/**
 * AgentError - Error types for Agent layer
 *
 * Standardized error structure for agent operations.
 */

/**
 * Error category
 */
export type AgentErrorCategory =
  | "network" // Network/API errors
  | "validation" // Input validation errors
  | "system" // Internal system errors
  | "business"; // Business logic errors

/**
 * AgentError - Standardized error structure
 */
export interface AgentError {
  /**
   * Error category
   */
  category: AgentErrorCategory;

  /**
   * Error code (e.g., "NETWORK_TIMEOUT", "INVALID_INPUT")
   */
  code: string;

  /**
   * Human-readable error message
   */
  message: string;

  /**
   * Whether the error is recoverable
   */
  recoverable: boolean;

  /**
   * Original error (if any)
   */
  cause?: Error;

  /**
   * Additional context
   */
  context?: Record<string, unknown>;
}
