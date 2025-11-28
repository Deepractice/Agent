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
// Function Signature - Authoritative API
// ============================================================================

/**
 * createAgentX - Factory function signature
 *
 * This is the authoritative API definition.
 * The agentx package must export a function matching this signature:
 *
 * ```typescript
 * import type { CreateAgentX } from "@deepractice-ai/agentx-types";
 *
 * export const createAgentX: CreateAgentX = (options) => {
 *   // implementation
 * };
 * ```
 */
export type CreateAgentX = (options?: AgentXOptions) => AgentX;
