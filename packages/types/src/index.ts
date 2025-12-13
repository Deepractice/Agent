/**
 * @agentxjs/types - Type definitions for AgentX AI Agent platform
 *
 * ## Package Structure
 *
 * ```
 * @agentxjs/types
 * │
 * ├── /agent          AgentEngine domain (independent, testable)
 * │   ├── AgentEngine, AgentDriver, AgentPresenter
 * │   ├── AgentEvent, StreamEvent, AgentStateEvent, AgentMessageEvent
 * │   └── Message, UserMessage, AssistantMessage, ToolCallMessage
 * │
 * ├── /runtime        Runtime domain (Container, Session, Sandbox)
 * │   ├── Runtime, Agent, Container, AgentImage
 * │   └── /internal   LLM, Sandbox, MCP, Environment
 * │
 * ├── /event          SystemEvent and all runtime events
 * │   ├── SystemEvent (source, category, intent, context)
 * │   └── DriveableEvent, ConnectionEvent, CommandEvent
 * │
 * ├── /agentx         AgentX high-level API types
 * │   └── AgentX, DefinitionAPI, ImageAPI, RuntimeAPI
 * │
 * └── /common         Shared infrastructure (Logger)
 * ```
 *
 * ## Submodule Imports (Recommended)
 *
 * ```typescript
 * // AgentEngine domain
 * import type { AgentEngine, AgentDriver } from "@agentxjs/types/agent";
 *
 * // Runtime domain
 * import type { Runtime, Agent, Container } from "@agentxjs/types/runtime";
 *
 * // Event system
 * import type { SystemEvent, DriveableEvent } from "@agentxjs/types/event";
 *
 * // High-level API
 * import type { AgentX } from "@agentxjs/types/agentx";
 * ```
 *
 * ## Two-Domain Architecture
 *
 * AgentEngine domain is independent and can be tested without Runtime:
 * - AgentEvent: lightweight (type, timestamp, data)
 * - StreamEvent → MealyMachine → AgentOutput
 *
 * Runtime domain manages the complete system:
 * - SystemEvent: full context (source, category, intent, context)
 * - Container lifecycle, Session persistence, Sandbox isolation
 *
 * Driver/Presenter bridge the two domains.
 *
 * @packageDocumentation
 */

// ============================================================================
// Common (shared infrastructure)
// ============================================================================

export * from "./common";

// ============================================================================
// Backwards Compatibility Re-exports
// ============================================================================

// Persistence types moved to runtime/internal, re-export for compatibility
export type {
  Persistence,
  ImageRepository,
  ContainerRepository,
  SessionRepository,
  ImageRecord,
  ContainerRecord,
  SessionRecord,
} from "./runtime/internal/persistence";

// AgentDefinition type for defining agents
export type { AgentDefinition } from "./agentx";
