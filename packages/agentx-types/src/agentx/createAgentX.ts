/**
 * CreateAgentX - Authoritative factory function signature
 *
 * Defines the standard API for creating AgentX instances.
 * The agentx package must implement this signature exactly.
 *
 * @example
 * ```typescript
 * import { createAgentX } from "@deepractice-ai/agentx";
 *
 * // Local mode (default)
 * const local = createAgentX();
 * const local = createAgentX({ mode: 'local' });
 *
 * // Remote mode
 * const remote = createAgentX({
 *   mode: 'remote',
 *   remote: { serverUrl: "http://localhost:5200/agentx" }
 * });
 * ```
 */

import type { AgentX } from "./AgentX";
import type { RemoteConfig } from "./AgentXConfig";

// ============================================================================
// Options - Discriminated Union
// ============================================================================

/**
 * Local mode options
 */
export interface AgentXLocalOptions {
  /**
   * Mode identifier (optional, defaults to 'local')
   */
  mode?: "local";
}

/**
 * Remote mode options
 */
export interface AgentXRemoteOptions {
  /**
   * Mode identifier (required for remote)
   */
  mode: "remote";

  /**
   * Remote server configuration (required for remote mode)
   */
  remote: RemoteConfig;
}

/**
 * AgentX creation options
 *
 * Discriminated union - TypeScript enforces:
 * - mode='local' or undefined: remote is not allowed
 * - mode='remote': remote config is required
 *
 * @example
 * ```typescript
 * // Local mode (default)
 * const opts1: AgentXOptions = {};
 * const opts2: AgentXOptions = { mode: 'local' };
 *
 * // Remote mode - remote is required
 * const opts3: AgentXOptions = {
 *   mode: 'remote',
 *   remote: { serverUrl: 'http://...' }
 * };
 * ```
 */
export type AgentXOptions = AgentXLocalOptions | AgentXRemoteOptions;

// ============================================================================
// Function Declaration - Authoritative API
// ============================================================================

/**
 * createAgentX - Factory function for creating AgentX instances
 *
 * This is the authoritative API definition.
 * The agentx package must implement this function exactly.
 *
 * @param options - AgentX creation options (local or remote mode)
 * @returns AgentX instance
 *
 * @example
 * ```typescript
 * // Local mode (default)
 * const agentx = createAgentX();
 *
 * // Remote mode
 * const agentx = createAgentX({
 *   mode: 'remote',
 *   remote: { serverUrl: 'http://localhost:5200/agentx' }
 * });
 * ```
 */
export declare function createAgentX(options?: AgentXOptions): AgentX;
