/**
 * Network Error
 *
 * Errors that occur during network operations.
 * These are typically connectivity issues.
 */

import type { BaseAgentError } from "./BaseAgentError";

/**
 * Network error codes
 */
export type NetworkErrorCode =
  | "CONNECTION_FAILED" // Failed to establish connection
  | "TIMEOUT" // Request timed out
  | "DNS_FAILED" // DNS resolution failed
  | "SSL_ERROR" // SSL/TLS error
  | "DISCONNECTED"; // Connection was disconnected

/**
 * Network Error
 */
export interface NetworkError extends BaseAgentError {
  category: "network";
  code: NetworkErrorCode;
}
