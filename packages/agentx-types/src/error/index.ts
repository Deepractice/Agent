/**
 * Error Types
 *
 * Defines the error type system for AgentX.
 *
 * Architecture:
 * - BaseAgentError: Common fields for all errors
 * - Category-specific errors: DriverError, LLMError, NetworkError, etc.
 * - AgentError: Union type of all error categories
 *
 * Design Principles:
 * - Category: The "layer" where the error occurred
 * - Code: The specific error type within that category
 * - Type Safety: Category and code combinations are constrained
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
