/**
 * AgentX Types
 *
 * Industry-level type definitions for the AI Agent ecosystem.
 *
 * ## Structure
 *
 * - **agentx/** - Platform context (AgentX - the central API)
 * - **agent/** - Agent system contracts (Agent, Driver, Presenter, Container)
 * - **error/** - Error type system (AgentError, categories, codes)
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

// Logger types
export * from "./logger";

// Config system
export * from "./config";

// ADK (Agent Development Kit)
export * from "./adk";

// Agent contracts
export * from "./agent";

// Error types
export * from "./error";

// Message types
export * from "./message";

// Event types
export * from "./event";

// LLM types
export * from "./llm";

// MCP types
export * from "./mcp";

// Session types
export * from "./session";

// Type guards
export * from "./guards";
