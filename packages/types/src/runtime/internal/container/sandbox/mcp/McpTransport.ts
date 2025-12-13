/**
 * MCP Transport Types
 *
 * Transport layer configuration for Model Context Protocol.
 * Defines how to connect to MCP servers via different protocols.
 */

/**
 * Stdio Transport Configuration
 *
 * Connect to MCP server via standard input/output (spawned process).
 * Common for local MCP servers.
 */
export interface McpStdioTransport {
  /** Transport type discriminator */
  type: "stdio";

  /** Command to execute */
  command: string;

  /** Command arguments */
  args?: string[];

  /** Environment variables */
  env?: Record<string, string>;

  /** Working directory */
  cwd?: string;
}

/**
 * SSE Transport Configuration
 *
 * Connect to MCP server via Server-Sent Events.
 * Common for remote MCP servers with streaming support.
 */
export interface McpSseTransport {
  /** Transport type discriminator */
  type: "sse";

  /** Server URL */
  url: string;

  /** HTTP headers */
  headers?: Record<string, string>;

  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * HTTP Transport Configuration
 *
 * Connect to MCP server via HTTP requests.
 * Common for stateless remote MCP servers.
 */
export interface McpHttpTransport {
  /** Transport type discriminator */
  type: "http";

  /** Server URL */
  url: string;

  /** HTTP headers */
  headers?: Record<string, string>;

  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * SDK Transport Configuration
 *
 * Use an in-process MCP server instance.
 * Common for embedded MCP servers in the same application.
 */
export interface McpSdkTransport {
  /** Transport type discriminator */
  type: "sdk";

  /** Server name */
  name: string;

  /** Server instance (implementation-specific) */
  instance: unknown;
}

/**
 * MCP Transport Config
 *
 * Union of all transport configuration types.
 */
export type McpTransportConfig =
  | McpStdioTransport
  | McpSseTransport
  | McpHttpTransport
  | McpSdkTransport;

/**
 * MCP Server Config (SDK Compatible)
 *
 * Configuration for MCP servers, compatible with Claude Agent SDK.
 * Used in AgentConfig.mcpServers.
 *
 * Note: For stdio type, the 'type' field is optional (defaults to stdio).
 */
export type McpServerConfig =
  | McpStdioServerConfig
  | McpSseServerConfig
  | McpHttpServerConfig
  | McpSdkServerConfig;

/**
 * Stdio Server Config (SDK Compatible)
 * Type is optional, defaults to stdio when omitted.
 */
export interface McpStdioServerConfig {
  type?: "stdio";
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

/**
 * SSE Server Config (SDK Compatible)
 */
export interface McpSseServerConfig {
  type: "sse";
  url: string;
  headers?: Record<string, string>;
}

/**
 * HTTP Server Config (SDK Compatible)
 */
export interface McpHttpServerConfig {
  type: "http";
  url: string;
  headers?: Record<string, string>;
}

/**
 * SDK Server Config (SDK Compatible)
 * For in-process MCP servers.
 */
export interface McpSdkServerConfig {
  type: "sdk";
  name: string;
  instance: unknown;
}
