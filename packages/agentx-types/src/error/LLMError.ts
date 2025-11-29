/**
 * LLM Error
 *
 * Errors that occur when interacting with LLM APIs.
 * These are typically issues with the AI provider.
 */

import type { BaseAgentError } from "./BaseAgentError";

/**
 * LLM error codes
 */
export type LLMErrorCode =
  | "API_ERROR" // Generic API error
  | "RATE_LIMITED" // Rate limit exceeded
  | "CONTEXT_TOO_LONG" // Context window exceeded
  | "INVALID_API_KEY" // API key invalid or missing
  | "MODEL_NOT_FOUND" // Requested model not found
  | "CONTENT_FILTERED" // Content was filtered by safety systems
  | "OVERLOADED"; // Service is overloaded

/**
 * LLM Error
 */
export interface LLMError extends BaseAgentError {
  category: "llm";
  code: LLMErrorCode;
}
