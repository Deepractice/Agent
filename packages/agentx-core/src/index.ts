/**
 * AgentX Core
 *
 * Core implementation of the AgentX ecosystem with layered architecture.
 * Provides interfaces (SPI contracts) and facade API for system-internal use.
 *
 * Architecture:
 * ```
 * index.ts (this file)
 *     ↓
 *     ├─→ interfaces/ (SPI contracts - for implementers)
 *     └─→ facade/ (system-internal API - for framework)
 *             ↓
 *         core/ (implementation - not exported)
 *             ├── agent/ (AgentServiceImpl, AgentEngine, EventBus, driver, reactor)
 *             └── environment/ (session management)
 * ```
 *
 * For platform-specific usage, use:
 * - @deepractice-ai/agentx-framework (Node.js and Browser)
 *
 * @packageDocumentation
 */

// ==================== Interfaces (SPI Contracts) ====================
// Export interfaces for third-party implementations
export * from "./interfaces";

// ==================== Facade API ====================
// Export facade layer - used by agentx-framework
export * from "./facade";
