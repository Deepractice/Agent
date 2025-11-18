/**
 * Error Message
 *
 * Represents an error that occurred during agent execution.
 * Error messages can be displayed in the conversation history alongside user/assistant messages.
 */

/**
 * Error categorization
 */
export type ErrorSubtype = "system" | "agent" | "llm" | "validation" | "unknown";

/**
 * Error severity level
 */
export type ErrorSeverity = "fatal" | "error" | "warning";

/**
 * Error Message Type
 *
 * Structured error information that can be displayed in conversation history.
 */
export interface ErrorMessage {
  /**
   * Unique message identifier
   */
  id: string;

  /**
   * Message role discriminator
   */
  role: "error";

  /**
   * Error category
   */
  subtype: ErrorSubtype;

  /**
   * Error severity level
   */
  severity: ErrorSeverity;

  /**
   * Human-readable error message
   */
  message: string;

  /**
   * Machine-readable error code (optional)
   */
  code?: string;

  /**
   * Additional error details (optional)
   */
  details?: unknown;

  /**
   * Whether the error is recoverable
   */
  recoverable?: boolean;

  /**
   * Stack trace (if available)
   */
  stack?: string;

  /**
   * Timestamp when error occurred
   */
  timestamp: number;
}
