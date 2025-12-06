/**
 * Engine Event Types (Lightweight)
 *
 * Lightweight event types for AgentEngine internal use.
 * These only contain: type, timestamp, data
 *
 * Full events (with source, category, intent, context) are in:
 * @agentxjs/types/event/agent
 *
 * ## Relationship
 *
 * ```
 * @agentxjs/types/event/agent     @agentxjs/types/agent/event
 * (Runtime domain - Full)          (Engine domain - Lightweight)
 * ────────────────────────────────────────────────────────────────
 * AgentEvent (SystemEvent)         EngineEvent
 *   type, timestamp, data            type, timestamp, data
 *   source, category, intent
 *   context
 *
 * TextDeltaEvent                   TextDeltaEvent
 *   (full SystemEvent)               = ToEngineEvent<Full>
 * ```
 */

// Base event type
export type { EngineEvent, ToEngineEvent, ToEngineEventUnion } from "./EngineEvent";

// For backward compatibility, alias EngineEvent as AgentEvent
import type { EngineEvent } from "./EngineEvent";
/**
 * @deprecated Use EngineEvent instead
 */
export type AgentEvent<T extends string = string, D = unknown> = EngineEvent<T, D>;

// Stream events
export * from "./stream";

// State events
export * from "./state";

// Message events
export * from "./message";

// Turn events
export * from "./turn";
