/**
 * MCP Resource Types
 *
 * Resource definitions for Model Context Protocol.
 * Resources are static data sources (files, documents, etc.) that can be read by the LLM.
 */

/**
 * Resource Definition
 *
 * Defines a resource that can be accessed by the LLM.
 */
export interface McpResource {
  /** Unique resource identifier (URI) */
  uri: string;

  /** Resource name */
  name: string;

  /** Optional human-readable title */
  title?: string;

  /** Optional description */
  description?: string;

  /** MIME type of the resource */
  mimeType?: string;

  /** Optional resource size in bytes */
  size?: number;

  /** Optional metadata */
  annotations?: Record<string, unknown>;
}

/**
 * Resource Template
 *
 * Defines a parameterized resource pattern.
 * Example: "file:///{path}" allows accessing any file path.
 */
export interface McpResourceTemplate {
  /** URI template with parameters (e.g., "file:///{path}") */
  uriTemplate: string;

  /** Template name */
  name: string;

  /** Optional title */
  title?: string;

  /** Optional description */
  description?: string;

  /** MIME type pattern */
  mimeType?: string;
}

/**
 * Resource Contents
 *
 * Actual content of a resource.
 */
export interface McpResourceContents {
  /** Resource URI */
  uri: string;

  /** Optional name */
  name?: string;

  /** Optional title */
  title?: string;

  /** MIME type */
  mimeType?: string;

  /** Text content (for text resources) */
  text?: string;

  /** Binary content (base64-encoded, for binary resources) */
  blob?: string;
}

/**
 * List Resources Result
 *
 * Response from listing available resources.
 */
export interface ListResourcesResult {
  /** Array of available resources */
  resources: McpResource[];

  /** Pagination cursor for next page */
  nextCursor?: string;

  /** Optional metadata */
  _meta?: Record<string, unknown>;
}

/**
 * List Resource Templates Result
 *
 * Response from listing available resource templates.
 */
export interface ListResourceTemplatesResult {
  /** Array of available resource templates */
  resourceTemplates: McpResourceTemplate[];

  /** Optional metadata */
  _meta?: Record<string, unknown>;
}

/**
 * Read Resource Result
 *
 * Response from reading a resource.
 */
export interface ReadResourceResult {
  /** Resource contents (array to support multi-part resources) */
  contents: McpResourceContents[];

  /** Optional metadata */
  _meta?: Record<string, unknown>;
}
