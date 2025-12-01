/**
 * SessionManager - Unified session management interface
 *
 * Part of Docker-style layered architecture:
 * Definition → build → Image → run → Agent
 *                        ↓
 *                    Session (external wrapper)
 *
 * @example
 * ```typescript
 * // Create session for an image and user
 * const session = await agentx.sessions.create(imageId, userId);
 *
 * // Resume agent from session
 * const agent = await session.resume();
 *
 * // List sessions by user
 * const sessions = await agentx.sessions.listByUser(userId);
 *
 * // Fork session
 * const forkedSession = await session.fork();
 *
 * // Cleanup
 * await agentx.sessions.destroy(sessionId);
 * ```
 */

import type { Session } from "~/session/Session";

/**
 * Session management interface
 */
export interface SessionManager {
  /**
   * Create a new session for an image and user
   *
   * @param imageId - The image ID to create session for
   * @param userId - The user ID who owns this session
   * @returns Created session
   */
  create(imageId: string, userId: string): Promise<Session>;

  /**
   * Get an existing session by ID
   *
   * @param sessionId - The session ID
   * @returns Session or undefined
   */
  get(sessionId: string): Promise<Session | undefined>;

  /**
   * Check if session exists
   *
   * @param sessionId - The session ID
   * @returns true if exists
   */
  has(sessionId: string): Promise<boolean>;

  /**
   * List all sessions
   *
   * @returns Array of all sessions
   */
  list(): Promise<Session[]>;

  /**
   * List all sessions for an image
   *
   * @param imageId - The image ID
   * @returns Array of sessions for the image
   */
  listByImage(imageId: string): Promise<Session[]>;

  /**
   * List all sessions for a user
   *
   * @param userId - The user ID
   * @returns Array of sessions for the user
   */
  listByUser(userId: string): Promise<Session[]>;

  /**
   * Destroy a session
   *
   * @param sessionId - The session ID
   */
  destroy(sessionId: string): Promise<void>;

  /**
   * Destroy all sessions for an image
   *
   * @param imageId - The image ID
   */
  destroyByImage(imageId: string): Promise<void>;

  /**
   * Destroy all sessions
   */
  destroyAll(): Promise<void>;
}
