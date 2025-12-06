/**
 * Engine Turn Events (Lightweight)
 *
 * Lightweight turn events for AgentEngine internal use.
 * Derived from full AgentTurnEvent in @agentxjs/types/event/agent.
 */

import type {
  AgentTurnEvent as FullAgentTurnEvent,
  TurnRequestEvent as FullTurnRequestEvent,
  TurnResponseEvent as FullTurnResponseEvent,
  TokenUsage,
} from "~/event/agent/turn";
import type { EngineEvent, ToEngineEvent, ToEngineEventUnion } from "../EngineEvent";

// Re-export TokenUsage (it's not an event, just a type)
export type { TokenUsage };

// ============================================================================
// Base Type (for backward compatibility)
// ============================================================================

/**
 * TurnEvent - Base type for turn events
 * @deprecated Use specific event types instead
 */
export interface TurnEvent<T extends string = string, D = unknown> extends EngineEvent<T, D> {}

// ============================================================================
// Lightweight Event Types
// ============================================================================

export type TurnRequestEvent = ToEngineEvent<FullTurnRequestEvent>;
export type TurnResponseEvent = ToEngineEvent<FullTurnResponseEvent>;

/**
 * AgentTurnEvent - All lightweight turn events
 */
export type AgentTurnEvent = ToEngineEventUnion<FullAgentTurnEvent>;

/**
 * Type guard: is this a turn event?
 */
export function isTurnEvent(event: EngineEvent): event is AgentTurnEvent {
  const turnTypes = ["turn_request", "turn_response"];
  return turnTypes.includes(event.type);
}
