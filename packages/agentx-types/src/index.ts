/**
 * AgentX Types
 *
 * Industry-level type definitions for the AI Agent ecosystem.
 * 137+ TypeScript files, zero runtime dependencies.
 *
 * ## Design Principles
 *
 * 1. **Contract-First**: Types define the API, implementations follow
 * 2. **Zero Dependencies**: Pure TypeScript types (except type guards)
 * 3. **Cross-Platform**: Works in Node.js, Browser, and Edge runtimes
 * 4. **Discriminated Unions**: Type-safe narrowing with `type` or `subtype`
 *
 * ## Module Structure
 *
 * | Module    | Files | Purpose                                    |
 * |-----------|-------|--------------------------------------------|
 * | agent/    | 11    | Core contracts (Agent, Driver, Presenter)  |
 * | event/    | 44    | 4-layer events (Stream→State→Message→Turn) |
 * | message/  | 13    | Message formats and content parts          |
 * | agentx/   | 17    | Platform API (Local/Remote modes)          |
 * | llm/      | 7     | LLM configuration and responses            |
 * | mcp/      | 7     | Model Context Protocol types               |
 * | error/    | 7     | Error taxonomy (category + code)           |
 * | adk/      | 4     | Agent Development Kit type declarations    |
 * | config/   | 3     | Configuration schema and inference         |
 * | logger/   | 4     | Logging facade types                       |
 * | session/  | 2     | Session/conversation context               |
 * | guards/   | 1     | Runtime type guards                        |
 *
 * ## Key Design Decisions
 *
 * See individual module index.ts files for detailed design decisions:
 * - `event/index.ts` - 4-layer architecture rationale
 * - `agent/index.ts` - Agent-as-Driver pattern
 * - `message/index.ts` - Role + Subtype discrimination
 * - `agentx/index.ts` - Local vs Remote modes
 * - `adk/index.ts` - Three-layer defineConfig pattern
 * - `error/index.ts` - Error taxonomy and serialization
 *
 * @packageDocumentation
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
