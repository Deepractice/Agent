/**
 * MCP Protocol Version
 *
 * Model Context Protocol version constants.
 * Based on the official MCP specification.
 */
export const LATEST_PROTOCOL_VERSION = "2025-06-18" as const;

export const SUPPORTED_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"] as const;

export type McpProtocolVersion = (typeof SUPPORTED_PROTOCOL_VERSIONS)[number];
