/**
 * AgentX Types - Industry-level type definitions for AI Agent ecosystem
 *
 * 140+ TypeScript files, zero runtime dependencies.
 *
 * ## ADR: Isomorphic Architecture
 *
 * AgentX uses an isomorphic architecture for "Define Once, Run Anywhere":
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    Application Code                         │
 * │                    (identical)                              │
 * │   const agentx = createAgentX(runtime);                     │
 * │   agentx.definitions.register(MyDef);                       │
 * └────────────────────────┬────────────────────────────────────┘
 *                          │
 *          ┌───────────────┴───────────────┐
 *          │                               │
 *          ▼                               ▼
 * ┌─────────────────────┐       ┌─────────────────────┐
 * │   Server Runtime    │       │   Browser Runtime   │
 * │   SQLiteRepository  │       │   RemoteRepository  │
 * │   (direct DB write) │       │   (HTTP → Server)   │
 * └─────────────────────┘       └─────────────────────┘
 * ```
 *
 * **Key Insight**: Business logic (agentx/) and infrastructure (runtime/) are separated.
 * Through Repository interface, same business code runs on Server or Browser.
 *
 * ## Module Structure
 *
 * | Module      | Purpose                                      | Layer          |
 * |-------------|----------------------------------------------|----------------|
 * | agentx/     | Business API (defineAgent, createAgentX)     | Business Logic |
 * | runtime/    | Infrastructure (Repository, Container)       | Infrastructure |
 * | definition/ | AgentDefinition (like Dockerfile)            | Source Layer   |
 * | image/      | AgentImage = MetaImage | DerivedImage        | Build Artifact |
 * | session/    | Session (user conversation)                  | Runtime        |
 * | agent/      | Agent core contracts                         | Core Layer     |
 * | event/      | 4-layer events (Stream→State→Message→Turn)   | Event Layer    |
 * | message/    | Message formats and content parts            | Message Layer  |
 *
 * ## Key ADR References
 *
 * - `agentx/index.ts` - Business API layer design
 * - `runtime/index.ts` - Infrastructure layer design
 * - `runtime/repository/index.ts` - Repository isomorphic design
 * - `issues/022-runtime-agentx-isomorphic-architecture.md` - Full architecture doc
 *
 * @packageDocumentation
 */

// ============================================================================
// Docker-style Layered Architecture
// AgentFile/Code → Definition → MetaImage → Session → Agent
// ============================================================================

// Agent state
export type { AgentState } from "./agent/AgentState";

// User types
export * from "./environment/user";

// Definition types (Docker-style: source template, like Dockerfile)
export * from "./environment/definition";

// Image types (Docker-style: built artifact, like Docker Image)
export * from "./environment/image";

// ============================================================================
// Business Logic Layer (Platform API)
// Platform-agnostic, isomorphic
// ============================================================================

// Platform context (AgentX) - includes defineAgent, createAgentX
// This is the business logic entry point, isomorphic via Runtime
export * from "./agentx";

// ============================================================================
// Infrastructure Layer (Runtime)
// Provides Repository, Container, Sandbox
// ============================================================================

// Runtime resource types (includes Repository for isomorphic storage)
// Repository is key to isomorphism: SQLiteRepository vs RemoteRepository
export * from "./runtime";

// ============================================================================
// Core Contracts
// Agent, Driver, Presenter, etc.
// ============================================================================

// Agent contracts
export * from "./agent";

// Common internal infrastructure (logger, etc.)
export * from "./common";

// Error types
export * from "./error";

// Message types
export * from "./agent/message";

// Event types (4-layer: Stream → State → Message → Turn)
export * from "./agent/event";

// LLM types
export * from "./llm";

// MCP types (Model Context Protocol)
export * from "./mcp";

// Session types
export * from "./environment/session";

// Container types
export * from "./environment/container";

// Type guards
export * from "./guards";
