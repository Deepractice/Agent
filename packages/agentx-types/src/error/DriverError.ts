/**
 * Driver Error
 *
 * Errors that occur in the Driver layer.
 * These are typically issues with driver initialization or execution.
 */

import type { BaseAgentError } from "./BaseAgentError";

/**
 * Driver error codes
 */
export type DriverErrorCode =
  | "NOT_FOUND" // Driver not found
  | "INIT_FAILED" // Driver initialization failed
  | "RECEIVE_FAILED" // Driver receive() execution failed
  | "ABORTED"; // Driver operation was aborted

/**
 * Driver Error
 */
export interface DriverError extends BaseAgentError {
  category: "driver";
  code: DriverErrorCode;
}
