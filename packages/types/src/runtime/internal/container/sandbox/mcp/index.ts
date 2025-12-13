/**
 * MCP (Model Context Protocol) Types
 *
 * Complete type definitions for the Model Context Protocol.
 * MCP enables LLMs to access tools, resources, and prompt templates.
 */

// Protocol
export {
  LATEST_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
  type McpProtocolVersion,
} from "./McpProtocol";

// Tools
export type {
  JsonSchema,
  JsonSchemaProperty,
  McpTool,
  TextContent,
  ImageContent,
  ResourceContent,
  McpToolResult,
  ListToolsResult,
} from "./McpTool";

// Resources
export type {
  McpResource,
  McpResourceTemplate,
  McpResourceContents,
  ListResourcesResult,
  ListResourceTemplatesResult,
  ReadResourceResult,
} from "./McpResource";

// Prompts
export type {
  McpPromptArgument,
  McpPrompt,
  PromptTextContent,
  PromptImageContent,
  PromptResourceContent,
  McpPromptMessage,
  ListPromptsResult,
  GetPromptResult,
} from "./McpPrompt";

// Server
export type { McpServerCapabilities, McpServerInfo, McpInitializeResult } from "./McpServer";

// Transport
export type {
  McpStdioTransport,
  McpSseTransport,
  McpHttpTransport,
  McpSdkTransport,
  McpTransportConfig,
  // SDK Compatible types
  McpServerConfig,
  McpStdioServerConfig,
  McpSseServerConfig,
  McpHttpServerConfig,
  McpSdkServerConfig,
} from "./McpTransport";

// Request
export type {
  McpBaseParams,
  McpPaginatedParams,
  McpRequest,
  McpRequestOptions,
} from "./McpRequest";
