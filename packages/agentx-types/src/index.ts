/**
 * AgentX Types
 *
 * Industry-level type definitions for the AI Agent ecosystem.
 * 140+ TypeScript files, zero runtime dependencies.
 *
 * ## Design Principles
 *
 * 1. **Contract-First**: Types define the API, implementations follow
 * 2. **Zero Dependencies**: Pure TypeScript types (except type guards)
 * 3. **Cross-Platform**: Works in Node.js, Browser, and Edge runtimes
 * 4. **Discriminated Unions**: Type-safe narrowing with `type` or `subtype`
 * 5. **"Define Once, Run Anywhere"**: Unified agent definition across platforms
 *
 * ## Module Structure
 *
 * | Module    | Files | Purpose                                    |
 * |-----------|-------|--------------------------------------------|
 * | agent/    | 14    | Core contracts (Agent, Driver, Presenter)  |
 * | event/    | 44    | 4-layer events (Stream→State→Message→Turn) |
 * | message/  | 13    | Message formats and content parts          |
 * | agentx/   | 13    | Platform API (defineAgent, createAgentX)   |
 * | runtime/  | 15+   | Runtime (Container, Sandbox, OS, LLM)      |
 * | llm/      | 7     | LLM configuration and responses            |
 * | mcp/      | 7     | Model Context Protocol types               |
 * | error/    | 7     | Error taxonomy (category + code)           |
 * | logger/   | 4     | Logging facade types                       |
 * | session/  | 2     | Session/conversation context               |
 * | guards/   | 3     | Runtime type guards                        |
 *
 * ## Key Design Decisions
 *
 * See individual module index.ts files for detailed design decisions:
 * - `event/index.ts` - 4-layer architecture rationale
 * - `agent/index.ts` - Agent-as-Driver pattern
 * - `message/index.ts` - Role + Subtype discrimination
 * - `agentx/index.ts` - defineAgent and createAgentX
 * - `runtime/index.ts` - Container, Sandbox, Runtime architecture
 * - `error/index.ts` - Error taxonomy and serialization
 *
 * @packageDocumentation
 */

// Agent state
export type { AgentState } from "./AgentState";

// User types
export * from "./user";

// Definition types (Docker-style: source template)
export * from "./definition";

// Image types (Docker-style: built artifact)
export * from "./image";

// Platform context (AgentX) - includes defineAgent
export * from "./agentx";

// Logger types
export * from "./logger";

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

// Runtime resource types (includes storage)
export * from "./runtime";

// Type guards
export * from "./guards";
