/**
 * RemoteSessionManager - Remote mode session management
 *
 * Extends base SessionManager with Remote-specific operations.
 */

import type { Session } from "~/session/Session";
import type { SessionManager } from "./SessionManager";

/**
 * Remote session management interface
 *
 * Remote mode creates sessions via HTTP and may need sync.
 */
export interface RemoteSessionManager extends SessionManager {
  /**
   * Create a new session for an agent (async in remote mode)
   *
   * @param agentId - The agent ID to create session for
   * @returns Promise of created session
   */
  create(agentId: string): Promise<Session>;

  /**
   * Sync local session cache with remote server
   *
   * @returns Promise that resolves when synced
   */
  sync(): Promise<void>;
}
