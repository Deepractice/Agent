/**
 * Error Message
 *
 * Message representation of an AgentError.
 * Can be displayed in the conversation history alongside user/assistant messages.
 *
 * Architecture:
 * - AgentError: The error definition (category, code, message, etc.)
 * - ErrorMessage: Message wrapper for displaying in conversation
 *
 * @example
 * ```typescript
 * const errorMessage: ErrorMessage = {
 *   id: "err_123",
 *   role: "error",
 *   error: {
 *     category: "llm",
 *     code: "RATE_LIMITED",
 *     message: "Rate limit exceeded, please try again later",
 *     severity: "error",
 *     recoverable: true,
 *   },
 *   timestamp: Date.now(),
 * };
 * ```
 */

import type { AgentError } from "~/error";

/**
 * Error Message Type
 *
 * Wraps an AgentError for display in conversation history.
 */
export interface ErrorMessage {
  /**
   * Unique message identifier
   */
  id: string;

  /**
   * Message role - system owns errors
   */
  role: "system";

  /**
   * Message subtype for serialization
   */
  subtype: "error";

  /**
   * The error that occurred
   */
  error: AgentError;

  /**
   * Timestamp when error occurred
   */
  timestamp: number;
}
