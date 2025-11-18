/**
 * Agent Domain Types
 *
 * All types related to AI agent's internal world:
 * - Agent data structure
 * - Messages (how agent communicates)
 * - MCP tools (agent capabilities)
 * - LLM configuration (agent's brain)
 * - Type guards (type safety)
 */

export type { Agent } from "./Agent";

// Message types
export * from "./message";

// MCP types
export * from "./mcp";

// LLM types
export * from "./llm";

// Type guards
export * from "./guards";
