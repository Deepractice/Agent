/**
 * MCP Tool Types
 *
 * Tool definitions and execution results for Model Context Protocol.
 */

/**
 * JSON Schema Definition
 *
 * Simplified JSON Schema for tool input parameters.
 * Based on JSON Schema Draft 7.
 */
export interface JsonSchema {
  /** Schema type (always "object" for MCP tools) */
  type: "object";

  /** Property definitions */
  properties?: Record<string, JsonSchemaProperty>;

  /** Required property names */
  required?: string[];

  /** Additional properties allowed */
  additionalProperties?: boolean;

  /** Schema description */
  description?: string;
}

export interface JsonSchemaProperty {
  type: "string" | "number" | "boolean" | "object" | "array" | "null";
  description?: string;
  enum?: unknown[];
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  default?: unknown;
}

/**
 * Tool Definition
 *
 * Defines a tool that can be invoked by the LLM.
 */
export interface McpTool {
  /** Tool name (unique identifier) */
  name: string;

  /** Human-readable description of what the tool does */
  description?: string;

  /** JSON Schema for input parameters */
  inputSchema: JsonSchema;

  /** Optional annotations (e.g., UI hints) */
  annotations?: {
    /** Display title */
    title?: string;
    /** Additional metadata */
    [key: string]: unknown;
  };
}

/**
 * Tool Call Result Content Types
 */

/** Text content in tool result */
export interface TextContent {
  type: "text";
  text: string;
}

/** Image content in tool result (base64-encoded) */
export interface ImageContent {
  type: "image";
  /** Base64-encoded image data */
  data: string;
  /** MIME type (e.g., "image/png") */
  mimeType: string;
}

/** Resource content reference */
export interface ResourceContent {
  type: "resource";
  resource: {
    /** Resource URI */
    uri: string;
    /** Optional resource name */
    name?: string;
    /** Optional resource title */
    title?: string;
    /** MIME type */
    mimeType?: string;
    /** Text content (for text resources) */
    text?: string;
    /** Binary content (base64-encoded, for binary resources) */
    blob?: string;
  };
}

/**
 * Tool Call Result
 *
 * Result returned from tool execution.
 */
export interface McpToolResult {
  /** Result content (array of different content types) */
  content: Array<TextContent | ImageContent | ResourceContent>;

  /** Whether this result represents an error */
  isError?: boolean;

  /** Optional metadata */
  _meta?: Record<string, unknown>;
}

/**
 * List Tools Result
 *
 * Response from listing available tools.
 */
export interface ListToolsResult {
  /** Array of available tools */
  tools: McpTool[];

  /** Pagination cursor for next page */
  nextCursor?: string;

  /** Optional metadata */
  _meta?: Record<string, unknown>;
}
