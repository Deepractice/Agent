/**
 * AgentX Types
 *
 * Industry-level type definitions for the AI Agent ecosystem.
 *
 * ## Structure
 *
 * - **agentx/** - Platform context (AgentX - the central API)
 * - **agent/** - Agent system contracts (Agent, Driver, Presenter, Container)
 * - **message/** - Message formats (user, assistant, tool, error)
 * - **event/** - Event types (stream, state, message, turn layers)
 * - **llm/** - LLM configuration and responses
 * - **mcp/** - Model Context Protocol types
 * - **guards/** - Type guards for runtime checking
 */

// Agent state
export type { AgentState } from "./AgentState";

// Platform context (AgentX)
export * from "./agentx";

// Agent contracts
export * from "./agent";

// Message types
export * from "./message";

// Event types
export * from "./event";

// LLM types
export * from "./llm";

// MCP types
export * from "./mcp";

// Type guards
export * from "./guards";
