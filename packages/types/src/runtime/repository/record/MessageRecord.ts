/**
 * MessageRecord - Storage schema for Message persistence
 *
 * Pure data type representing a message in storage.
 * Content is stored as JSON to accommodate different message types.
 */

import type { MessageRole } from "~/agent/message/MessageRole";

/**
 * Message storage record
 */
export interface MessageRecord {
  /**
   * Unique message identifier
   */
  messageId: string;

  /**
   * Associated session identifier
   */
  sessionId: string;

  /**
   * Message role: user, assistant, tool-call, tool-result
   */
  role: MessageRole;

  /**
   * Serialized message content (JSON)
   * Structure varies by role type
   */
  content: Record<string, unknown>;

  /**
   * Creation timestamp
   */
  createdAt: Date;
}
