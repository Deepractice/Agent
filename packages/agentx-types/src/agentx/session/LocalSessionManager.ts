/**
 * LocalSessionManager - Local mode session management
 *
 * Extends base SessionManager with Local-specific operations.
 */

import type { Session } from "~/session/Session";
import type { SessionManager } from "./SessionManager";

/**
 * Local session management interface
 *
 * Local mode can directly create sessions in memory.
 */
export interface LocalSessionManager extends SessionManager {
  /**
   * Create a new session for an agent (synchronous in local mode)
   *
   * @param agentId - The agent ID to create session for
   * @returns Created session
   */
  create(agentId: string): Session;
}
