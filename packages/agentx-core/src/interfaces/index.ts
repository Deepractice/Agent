/**
 * AgentX Core Interfaces
 *
 * SPI (Service Provider Interface) contracts for agentx-core.
 * These interfaces define the contracts for:
 * - AgentService: User-facing agent runtime API
 * - AgentDriver: Platform-specific LLM driver implementations
 * - AgentLogger: Platform-specific logging implementations
 * - AgentReactor: Event processing units (low-level)
 * - Layer-specific Reactors: User-friendly interfaces for 4-layer event handling
 *
 * Third-party implementations should depend on these interfaces.
 */

// ==================== Core Interfaces ====================

// Agent runtime interface
export type { AgentService } from "./AgentService";

// Driver interface (SPI)
export type { AgentDriver } from "./AgentDriver";

// ==================== Reactor Interfaces ====================

// Low-level Reactor pattern (advanced usage)
export type { AgentReactor, AgentReactorContext } from "./AgentReactor";

// 4-Layer Reactor interfaces (user-friendly)
export type { StreamReactor } from "./StreamReactor";
export type { StateReactor } from "./StateReactor";
export type { MessageReactor } from "./MessageReactor";
export type { ExchangeReactor } from "./ExchangeReactor";
