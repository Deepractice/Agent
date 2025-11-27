/**
 * SessionManager - Base session management interface
 *
 * Common operations shared by Local and Remote session managers.
 */

import type { Session } from "~/session/Session";

/**
 * Base session management interface
 *
 * Defines operations common to both Local and Remote modes.
 */
export interface SessionManager {
  /**
   * Get an existing session by ID
   *
   * @param sessionId - The session ID
   * @returns Session or undefined
   */
  get(sessionId: string): Promise<Session | undefined>;

  /**
   * List all sessions for an agent
   *
   * @param agentId - The agent ID
   * @returns Array of sessions
   */
  listByAgent(agentId: string): Promise<Session[]>;

  /**
   * Destroy a session
   *
   * @param sessionId - The session ID
   * @returns Promise that resolves when destroyed
   */
  destroy(sessionId: string): Promise<void>;
}
