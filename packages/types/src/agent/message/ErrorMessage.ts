/**
 * Error Message
 *
 * Message representing an error that occurred during conversation.
 * Displayed in the chat history so users can see what went wrong.
 */
export interface ErrorMessage {
  /** Unique identifier */
  id: string;

  /** Message role */
  role: "error";

  /** Message subtype for serialization */
  subtype: "error";

  /** Error message content (human-readable) */
  content: string;

  /** Error code (e.g., "rate_limit_error", "api_error") */
  errorCode?: string;

  /** When this error occurred (Unix timestamp in milliseconds) */
  timestamp: number;

  /** Parent message ID for threading (optional) */
  parentId?: string;
}
