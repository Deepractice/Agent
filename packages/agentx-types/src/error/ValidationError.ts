/**
 * Validation Error
 *
 * Errors that occur during input validation.
 * These are typically issues with user input or configuration.
 */

import type { BaseAgentError } from "./BaseAgentError";

/**
 * Validation error codes
 */
export type ValidationErrorCode =
  | "INVALID_MESSAGE" // Message format is invalid
  | "INVALID_CONFIG" // Configuration is invalid
  | "MISSING_REQUIRED" // Required field is missing
  | "TYPE_MISMATCH" // Type does not match expected
  | "OUT_OF_RANGE"; // Value is out of allowed range

/**
 * Validation Error
 */
export interface ValidationError extends BaseAgentError {
  category: "validation";
  code: ValidationErrorCode;
}
