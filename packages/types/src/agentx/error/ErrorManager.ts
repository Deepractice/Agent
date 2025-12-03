/**
 * ErrorManager - Platform-level error management
 *
 * Collects and handles all agent errors at the platform level.
 * Only available in Local mode (remote clients handle their own errors).
 *
 * Design:
 * - Default behavior: Always logs errors (no silent failures)
 * - Extensible: User can add custom handlers (Sentry, alerting, etc.)
 * - Unified: All agent errors flow through here
 *
 * @example
 * ```typescript
 * const agentx = createAgentX();
 *
 * // Add custom error handler
 * agentx.errors.addHandler({
 *   handle: (agentId, error, event) => {
 *     Sentry.captureException(error.cause, {
 *       tags: { agentId, category: error.category }
 *     });
 *   }
 * });
 * ```
 */

import type { AgentError } from "~/error";
import type { ErrorEvent } from "~/agent/event/error";
import type { Unsubscribe } from "~/agent/AgentEventHandler";

/**
 * Error handler callback
 */
export interface ErrorHandler {
  /**
   * Handle an error from an agent
   *
   * @param agentId - The agent that produced the error
   * @param error - The classified error
   * @param event - The full error event
   */
  handle(agentId: string, error: AgentError, event: ErrorEvent): void;
}

/**
 * Platform-level error management interface (Local only)
 */
export interface ErrorManager {
  /**
   * Add a custom error handler
   *
   * @param handler - Error handler to add
   * @returns Unsubscribe function
   */
  addHandler(handler: ErrorHandler): Unsubscribe;

  /**
   * Remove an error handler
   *
   * @param handler - Error handler to remove
   */
  removeHandler(handler: ErrorHandler): void;
}
