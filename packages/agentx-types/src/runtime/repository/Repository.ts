/**
 * Repository - Unified persistence interface for AgentX
 *
 * Single interface for all data operations (images, sessions, messages).
 * Implementations can be local (SQLite) or remote (HTTP API).
 *
 * Part of Docker-style layered architecture:
 * Definition → build → Image → run → Agent
 *                        ↓
 *                    Session (external wrapper)
 *
 * @example
 * ```typescript
 * // Local implementation (agentx-node)
 * const repository = new SQLiteRepository(dbPath);
 *
 * // Remote implementation (agentx browser)
 * const repository = new RemoteRepository({ serverUrl: "http://..." });
 *
 * // Use with runtime
 * const runtime = createRuntime({ repository });
 * ```
 */

import type { ImageRecord } from "./record/ImageRecord";
import type { SessionRecord } from "./record/SessionRecord";
import type { MessageRecord } from "./record/MessageRecord";

/**
 * Repository - Unified persistence interface
 */
export interface Repository {
  // ==================== Image ====================

  /**
   * Save an image record (create or update)
   */
  saveImage(record: ImageRecord): Promise<void>;

  /**
   * Find image by ID
   */
  findImageById(imageId: string): Promise<ImageRecord | null>;

  /**
   * Find all images
   */
  findAllImages(): Promise<ImageRecord[]>;

  /**
   * Delete image by ID (cascades to sessions)
   */
  deleteImage(imageId: string): Promise<void>;

  /**
   * Check if image exists
   */
  imageExists(imageId: string): Promise<boolean>;

  // ==================== Session ====================

  /**
   * Save a session record (create or update)
   */
  saveSession(record: SessionRecord): Promise<void>;

  /**
   * Find session by ID
   */
  findSessionById(sessionId: string): Promise<SessionRecord | null>;

  /**
   * Find all sessions for an image
   */
  findSessionsByImageId(imageId: string): Promise<SessionRecord[]>;

  /**
   * Find all sessions for a user
   */
  findSessionsByUserId(userId: string): Promise<SessionRecord[]>;

  /**
   * Find all sessions
   */
  findAllSessions(): Promise<SessionRecord[]>;

  /**
   * Delete session by ID
   */
  deleteSession(sessionId: string): Promise<void>;

  /**
   * Delete all sessions for an image
   */
  deleteSessionsByImageId(imageId: string): Promise<void>;

  /**
   * Check if session exists
   */
  sessionExists(sessionId: string): Promise<boolean>;

  // ==================== Message ====================
  // Note: Messages are now stored in ImageRecord.messages
  // These methods are kept for backward compatibility during migration

  /**
   * Save a message record
   * @deprecated Messages should be stored in ImageRecord.messages
   */
  saveMessage(record: MessageRecord): Promise<void>;

  /**
   * Find message by ID
   * @deprecated Messages should be stored in ImageRecord.messages
   */
  findMessageById(messageId: string): Promise<MessageRecord | null>;

  /**
   * Find all messages for a session (ordered by createdAt)
   * @deprecated Messages should be stored in ImageRecord.messages
   */
  findMessagesBySessionId(sessionId: string): Promise<MessageRecord[]>;

  /**
   * Delete message by ID
   * @deprecated Messages should be stored in ImageRecord.messages
   */
  deleteMessage(messageId: string): Promise<void>;

  /**
   * Delete all messages for a session
   * @deprecated Messages should be stored in ImageRecord.messages
   */
  deleteMessagesBySessionId(sessionId: string): Promise<void>;

  /**
   * Count messages in a session
   * @deprecated Messages should be stored in ImageRecord.messages
   */
  countMessagesBySessionId(sessionId: string): Promise<number>;
}
