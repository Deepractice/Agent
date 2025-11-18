/**
 * AgentX Types
 *
 * Core type definitions for the Deepractice AgentX ecosystem.
 *
 * ## Domain Structure
 *
 * - **agent/** - Agent's internal world (messages, tools, llm config)
 * - **environment/** - Agent's external world (sessions, channels, groups)
 */

// ==================== Agent Domain ====================
// Re-export everything from agent domain
export * from "./agent";

// ==================== Environment Domain ====================
// Re-export everything from environment domain
export * from "./environment";
