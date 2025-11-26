/**
 * MCP Server Types
 *
 * Server configuration and capabilities for Model Context Protocol.
 */

/**
 * Server Capabilities
 *
 * Declares what features the MCP server supports.
 */
export interface McpServerCapabilities {
  /** Experimental features */
  experimental?: Record<string, unknown>;

  /** Logging capabilities */
  logging?: Record<string, unknown>;

  /** Prompt capabilities */
  prompts?: {
    /** Whether server supports prompts/list-changed notification */
    listChanged?: boolean;
  };

  /** Resource capabilities */
  resources?: {
    /** Whether server supports resource subscriptions */
    subscribe?: boolean;
    /** Whether server supports resources/list-changed notification */
    listChanged?: boolean;
  };

  /** Tool capabilities */
  tools?: {
    /** Whether server supports tools/list-changed notification */
    listChanged?: boolean;
  };
}

/**
 * Server Information
 *
 * Metadata about the MCP server.
 */
export interface McpServerInfo {
  /** Server name */
  name: string;

  /** Server version */
  version: string;
}

/**
 * Initialize Result
 *
 * Response from MCP server initialization.
 */
export interface McpInitializeResult {
  /** Protocol version the server is using */
  protocolVersion: string;

  /** Server capabilities */
  capabilities: McpServerCapabilities;

  /** Server information */
  serverInfo: McpServerInfo;

  /** Optional human-readable instructions */
  instructions?: string;

  /** Optional metadata */
  _meta?: Record<string, unknown>;
}
