/**
 * System Message
 *
 * Message from the system (notifications, status updates, etc.).
 * Always contains simple string content.
 */
export interface SystemMessage {
  /** Unique identifier */
  id: string;

  /** Message role */
  role: "system";

  /** Message subtype for serialization */
  subtype: "system";

  /** Message content - always a string */
  content: string;

  /** When this message was created (Unix timestamp in milliseconds) */
  timestamp: number;

  /** Parent message ID for threading (optional) */
  parentId?: string;
}
