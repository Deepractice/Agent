/**
 * System Error
 *
 * Errors that occur in the system/framework layer.
 * These are typically internal issues.
 */

import type { BaseAgentError } from "./BaseAgentError";

/**
 * System error codes
 */
export type SystemErrorCode =
  | "AGENT_DESTROYED" // Agent has been destroyed
  | "ENGINE_ERROR" // Engine processing error
  | "PRESENTER_ERROR" // Presenter handling error
  | "HANDLER_ERROR" // Event handler error
  | "INTERNAL_ERROR" // Internal system error
  | "UNKNOWN"; // Unknown error

/**
 * System Error
 */
export interface SystemError extends BaseAgentError {
  category: "system";
  code: SystemErrorCode;
}
