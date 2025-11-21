/**
 * AgentX Core
 *
 * Core implementation of the AgentX ecosystem.
 * Provides low-level interfaces and implementations.
 *
 * Architecture:
 * ```
 * index.ts (this file)
 *     ↓
 *     ├─→ interfaces/ (SPI contracts - for implementers)
 *     │       ├── agent/ (AgentService, AgentDriver, AgentReactor)
 *     │       └── environment/ (session management)
 *     └─→ core/ (implementations)
 *             └── agent/AgentServiceImpl (concrete implementation)
 * ```
 *
 * For high-level API, use:
 * - @deepractice-ai/agentx-framework (provides defineAgent, createAgent, etc.)
 *
 * @packageDocumentation
 */

// ==================== Interfaces (SPI Contracts) ====================
// Export interfaces for third-party implementations
export * from "./interfaces";

// ==================== Core Implementations ====================
// Export concrete implementations for framework layer
export { AgentServiceImpl } from "./core/agent/AgentServiceImpl";
export type { EngineConfig } from "./core/agent/AgentEngine";
export { SessionStore } from "./core/session/SessionStore";

// ==================== Utilities ====================
// Export utilities for framework and user code
export * from "./utils";
