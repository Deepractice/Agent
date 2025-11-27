/**
 * AgentX Creation API - Authoritative function signatures
 *
 * Defines the standard API for creating AgentX instances.
 * The agentx package must implement these signatures exactly.
 *
 * @example
 * ```typescript
 * import { createAgentX } from "@deepractice-ai/agentx";
 *
 * // Local mode (no options)
 * const local = createAgentX();
 *
 * // Remote mode (with serverUrl)
 * const remote = createAgentX({ serverUrl: "http://localhost:5200/agentx" });
 * ```
 */

import type { AgentError } from "~/error";
import type { AgentXLocal, AgentXRemote, AgentX } from "./AgentX";

// ============================================================================
// Options
// ============================================================================

/**
 * Options for creating AgentX instance (auto-detect mode)
 */
export interface AgentXOptions {
  /**
   * Remote server URL
   *
   * If provided, creates AgentXRemote.
   * If not provided, creates AgentXLocal.
   */
  serverUrl?: string;

  /**
   * Request headers for remote mode
   */
  headers?: Record<string, string>;

  /**
   * Default error handler (Local mode only)
   */
  onError?: (agentId: string, error: AgentError) => void;
}

/**
 * Options for Local mode
 */
export interface AgentXLocalOptions {
  /**
   * Default error handler
   */
  onError?: (agentId: string, error: AgentError) => void;
}

/**
 * Options for Remote mode
 */
export interface AgentXRemoteOptions {
  /**
   * Remote server URL (required)
   */
  serverUrl: string;

  /**
   * Request headers for authentication, etc.
   */
  headers?: Record<string, string>;
}

// ============================================================================
// Function Signature - Authoritative API
// ============================================================================

/**
 * createAgentX - Create AgentX instance
 *
 * This is the authoritative API definition.
 * The agentx package exports a function matching this signature.
 *
 * @example
 * ```typescript
 * // Local mode
 * const local = createAgentX();
 * const local = createAgentX({ onError: handler });
 *
 * // Remote mode
 * const remote = createAgentX({ serverUrl: "http://..." });
 * ```
 */
export interface CreateAgentX {
  /** Create Local AgentX (no options) */
  (): AgentXLocal;

  /** Create Local AgentX (with local options) */
  (options: AgentXLocalOptions): AgentXLocal;

  /** Create Remote AgentX (with serverUrl) */
  (options: AgentXRemoteOptions): AgentXRemote;

  /** Create AgentX (auto-detect mode) */
  (options?: AgentXOptions): AgentX;
}
