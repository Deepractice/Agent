/**
 * AgentX Types
 *
 * Industry-level type definitions for the AI Agent ecosystem.
 *
 * ## Structure
 *
 * - **message/** - Message formats (user, assistant, tool, error)
 * - **llm/** - LLM configuration and responses
 * - **mcp/** - Model Context Protocol types
 * - **guards/** - Type guards for runtime checking
 */

// Agent state
export type { AgentState } from "./AgentState";

// Message types
export * from "./message";

// LLM types
export * from "./llm";

// MCP types
export * from "./mcp";

// Type guards
export * from "./guards";
