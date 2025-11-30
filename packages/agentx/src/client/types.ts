/**
 * Client Types
 *
 * Type definitions for AgentX client module (browser).
 */

// ============================================================================
// Connection Types (for SSE)
// ============================================================================

/**
 * Connection state
 */
export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";
