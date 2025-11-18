/**
 * MCP Request Types
 *
 * Request/response types for JSON-RPC based MCP communication.
 */

/**
 * Base Request Parameters
 *
 * Common parameters for all MCP requests.
 */
export interface McpBaseParams {
  /** Optional metadata */
  _meta?: Record<string, unknown>;
}

/**
 * Paginated Request Parameters
 *
 * Parameters for paginated requests.
 */
export interface McpPaginatedParams extends McpBaseParams {
  /** Pagination cursor */
  cursor?: string;
}

/**
 * MCP Request
 *
 * Generic request structure.
 */
export interface McpRequest {
  /** RPC method name */
  method: string;

  /** Request parameters */
  params?: McpBaseParams;
}

/**
 * Request Options
 *
 * Options for making requests.
 */
export interface McpRequestOptions {
  /** Abort signal for cancellation */
  signal?: AbortSignal;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Maximum total timeout (including retries) */
  maxTotalTimeout?: number;
}
