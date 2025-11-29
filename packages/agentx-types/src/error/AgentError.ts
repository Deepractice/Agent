/**
 * Agent Error
 *
 * Union type of all agent error categories.
 * This is the main error type used throughout the system.
 *
 * Design Principles:
 * - Category: The "layer" where the error occurred (driver, llm, network, etc.)
 * - Code: The specific error type within that category
 * - Relationship: Each category has its own set of codes (type-safe)
 *
 * @example
 * ```typescript
 * // Type-safe: category and code combination is constrained
 * const error: AgentError = {
 *   category: "llm",
 *   code: "RATE_LIMITED",  // Only LLM codes allowed
 *   message: "Rate limit exceeded",
 *   severity: "error",
 *   recoverable: true,
 * };
 *
 * // Type guard usage
 * if (error.category === "llm") {
 *   // error.code is narrowed to LLMErrorCode
 *   console.log(`LLM error: ${error.code}`);
 * }
 * ```
 */

import type { DriverError } from "./DriverError";
import type { LLMError } from "./LLMError";
import type { NetworkError } from "./NetworkError";
import type { ValidationError } from "./ValidationError";
import type { SystemError } from "./SystemError";

/**
 * Agent Error - Union of all error categories
 *
 * Type-safe error representation where category and code
 * combinations are constrained by TypeScript.
 */
export type AgentError = DriverError | LLMError | NetworkError | ValidationError | SystemError;

/**
 * All possible error categories
 */
export type AgentErrorCategory = AgentError["category"];

/**
 * All possible error codes (union of all category codes)
 */
export type AgentErrorCode = AgentError["code"];
