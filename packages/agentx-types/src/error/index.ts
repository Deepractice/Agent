/**
 * Error Types
 *
 * Defines the error type system for AgentX.
 *
 * ## Design Decision: Structured Error Taxonomy
 *
 * Errors are classified by category (WHERE) and code (WHAT):
 *
 * | Category     | Examples                              | Recovery |
 * |--------------|---------------------------------------|----------|
 * | driver       | INIT_FAILED, INVALID_CONFIG           | Maybe    |
 * | llm          | API_ERROR, RATE_LIMITED, OVERLOADED   | Retry    |
 * | network      | TIMEOUT, CONNECTION_REFUSED           | Retry    |
 * | validation   | INVALID_MESSAGE, MISSING_REQUIRED     | Fix input|
 * | system       | OUT_OF_MEMORY, INTERNAL_ERROR         | No       |
 *
 * ## Design Decision: Severity Levels
 *
 * Three severity levels for error handling:
 * - **fatal**: System cannot continue, requires restart
 * - **error**: Operation failed, but system can continue
 * - **warning**: Potential issue, operation may succeed
 *
 * ## Design Decision: Recoverability Flag
 *
 * `recoverable: boolean` indicates whether retry makes sense:
 * - `true`: Transient error, retry may succeed (rate limit, timeout)
 * - `false`: Permanent error, retry will fail (invalid config)
 *
 * ## Why Not Use Native Error?
 *
 * AgentError is a plain object, not an Error class, because:
 * 1. **Serializable**: Can be sent via SSE, stored in JSON
 * 2. **Type-safe**: Discriminated union enables precise handling
 * 3. **Cross-platform**: Works in Node.js, Browser, Edge
 *
 * ```typescript
 * // Native Error is not serializable
 * JSON.stringify(new Error("fail")) // "{}"
 *
 * // AgentError is fully serializable
 * JSON.stringify(agentError) // "{ category: ..., code: ..., message: ... }"
 * ```
 */

// Base
export type { BaseAgentError, ErrorSeverity } from "./BaseAgentError";

// Category-specific errors
export type { DriverError, DriverErrorCode } from "./DriverError";
export type { LLMError, LLMErrorCode } from "./LLMError";
export type { NetworkError, NetworkErrorCode } from "./NetworkError";
export type { ValidationError, ValidationErrorCode } from "./ValidationError";
export type { SystemError, SystemErrorCode } from "./SystemError";

// Union type
export type { AgentError, AgentErrorCategory, AgentErrorCode } from "./AgentError";
