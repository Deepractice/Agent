/**
 * ErrorEvent - System-wide error events
 *
 * Generic error events for reporting failures and exceptions.
 * These are independent notification events that can be:
 * - Associated with a request (via requestId)
 * - Asynchronous (not tied to any request)
 * - Used for UI notifications
 *
 * Design:
 * - Start with generic SystemError
 * - Gradually refine to specific error types (ContainerNotFoundError, etc.)
 */

import type { SystemEvent } from "../base";

/**
 * SystemError - Generic error event
 *
 * Used for all errors until we create specific error types.
 * Can originate from any source (runtime, agent, container, etc.)
 *
 * @example
 * ```typescript
 * const error: SystemError = {
 *   type: "system_error",
 *   timestamp: Date.now(),
 *   source: "container",
 *   category: "error",
 *   intent: "notification",
 *   data: {
 *     message: "Container not found: default",
 *     requestId: "req_123",
 *     severity: "error",
 *   },
 *   context: { containerId: "default" }
 * };
 * ```
 */
export interface SystemError
  extends SystemEvent<
    "system_error",
    {
      /**
       * Error message (human-readable)
       */
      message: string;

      /**
       * Associated request ID (if error is related to a request)
       */
      requestId?: string;

      /**
       * Error severity
       * - info: Informational, no action needed
       * - warn: Warning, operation succeeded but with issues
       * - error: Error, operation failed
       * - fatal: Fatal error, system unstable
       */
      severity?: "info" | "warn" | "error" | "fatal";

      /**
       * Additional error details (stack trace, error code, etc.)
       */
      details?: unknown;
    },
    "agent" | "container" | "environment" | "session" | "sandbox" | "command",
    "error",
    "notification"
  > {}

/**
 * Error event map - will grow as we add specific error types
 */
export interface ErrorEventMap {
  system_error: SystemError;
  // Future: container_not_found_error, agent_creation_error, llm_api_error, etc.
}

/**
 * Error event types
 */
export type ErrorEventType = keyof ErrorEventMap;

/**
 * Union of all error events
 */
export type ErrorEvent = ErrorEventMap[ErrorEventType];
