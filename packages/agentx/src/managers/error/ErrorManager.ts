/**
 * ErrorManager - Platform-level error management
 *
 * Collects and handles all agent errors at the platform level.
 * Ensures no error is lost, even if user doesn't register handlers.
 *
 * Design:
 * - Default behavior: Always logs errors (no silent failures)
 * - Extensible: User can add custom handlers (Sentry, alerting, etc.)
 * - Unified: All agent errors flow through here
 *
 * Note: Only available in Local mode. Remote clients handle
 * errors themselves due to environment-specific differences.
 */

import type {
  ErrorManager as IErrorManager,
  ErrorHandler,
  AgentError,
  ErrorMessageEvent,
  Unsubscribe,
} from "@deepractice-ai/agentx-types";
import { createLogger } from "@deepractice-ai/agentx-logger";

const logger = createLogger("agentx/ErrorManager");

/**
 * Platform-level error manager implementation
 */
export class ErrorManager implements IErrorManager {
  private readonly handlers: Set<ErrorHandler> = new Set();

  /**
   * Handle an error from any agent
   *
   * Called internally when an agent emits an error event.
   * 1. Default logging (always)
   * 2. Custom handlers (user-registered)
   */
  handle(agentId: string, error: AgentError, event: ErrorMessageEvent): void {
    // 1. Default logging (always happens)
    this.logError(agentId, error);

    // 2. Custom handlers
    for (const handler of this.handlers) {
      try {
        handler.handle(agentId, error, event);
      } catch (e) {
        // Handler error should not break the chain
        logger.error("ErrorHandler failed", { error: e });
      }
    }
  }

  /**
   * Add a custom error handler
   */
  addHandler(handler: ErrorHandler): Unsubscribe {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  /**
   * Remove an error handler
   */
  removeHandler(handler: ErrorHandler): void {
    this.handlers.delete(handler);
  }

  /**
   * Default error logging
   */
  private logError(agentId: string, error: AgentError): void {
    const prefix = `[${agentId}] ${error.category}/${error.code}`;

    if (error.severity === "fatal") {
      logger.error(`${prefix}: ${error.message}`, { error });
    } else if (error.severity === "error") {
      logger.error(`${prefix}: ${error.message}`);
    } else {
      logger.warn(`${prefix}: ${error.message}`);
    }
  }
}
