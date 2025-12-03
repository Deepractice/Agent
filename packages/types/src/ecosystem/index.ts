/**
 * Ecosystem Module - Runtime environment for AI Agents
 *
 * ## Event Architecture (Simplified)
 *
 * Two types of events:
 * 1. **EnvironmentEvent** - External raw materials (text_chunk, stream_start, etc.)
 * 2. **AgentEvent** - Agent internal events (assembled by Mealy Machine)
 *
 * EnvironmentEvent + context flows on SystemBus directly.
 * No separate RuntimeEvent definition needed.
 *
 * @see issues/029-simplified-event-architecture.md
 * @packageDocumentation
 */

// ============================================================================
// Pure Abstractions (Systems Theory)
// ============================================================================

export type { Ecosystem, EcosystemEventHandler } from "./Ecosystem";
export type { Environment } from "./Environment";
export type { Receptor } from "./Receptor";
export type { Effector } from "./Effector";
export type { SystemBus, BusEvent, BusEventHandler, Unsubscribe } from "./SystemBus";

// ============================================================================
// Environment Events
// ============================================================================

export * from "./event";

// ============================================================================
// Runtime Layer
// ============================================================================

// Runtime interface
export type { Runtime, AgentIdResolver } from "./runtime/Runtime";

// RuntimeDriver - Driver + Sandbox combination
export type { RuntimeDriver } from "~/ecosystem/runtime/container/driver/RuntimeDriver";

// Container and Sandbox
export * from "./runtime/container";
export * from "~/ecosystem/runtime/container/sandbox";

// Session
export * from "./runtime/session";

// Repository
export * from "./runtime/repository";

// ============================================================================
// Agent Layer
// ============================================================================

export * from "./runtime/agent";
export * from "~/ecosystem/runtime/agent/message";
export * from "~/ecosystem/runtime/agent/event";
