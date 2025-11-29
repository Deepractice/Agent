/**
 * Base Agent Error
 *
 * Common fields for all agent errors.
 * This is the base interface that all category-specific errors extend.
 */

/**
 * Error severity level
 */
export type ErrorSeverity = "fatal" | "error" | "warning";

/**
 * Base Agent Error interface
 *
 * Contains common fields for all error types.
 * Category-specific errors extend this with their own category and code.
 */
export interface BaseAgentError {
  /**
   * Error category (defined by specific error types)
   */
  category: string;

  /**
   * Error code within the category (defined by specific error types)
   */
  code: string;

  /**
   * Human-readable error message
   */
  message: string;

  /**
   * Error severity level
   */
  severity: ErrorSeverity;

  /**
   * Whether this error is recoverable
   * - true: Operation can be retried or user can take action
   * - false: Fatal error, cannot recover
   */
  recoverable: boolean;

  /**
   * Original error that caused this error (if any)
   */
  cause?: Error;

  /**
   * Additional metadata about the error
   */
  metadata?: Record<string, unknown>;
}
