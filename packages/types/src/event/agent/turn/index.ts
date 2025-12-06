/**
 * Agent Turn Events
 *
 * Turn-level events for analytics and billing.
 * A turn = one user message + assistant response cycle.
 * - source: "agent"
 * - category: "turn"
 * - intent: "notification"
 */

import type { BaseAgentEvent } from "../BaseAgentEvent";

/**
 * Base type for turn events
 */
export interface AgentTurnEventBase<T extends string, D>
  extends BaseAgentEvent<T, D, "turn"> {}

/**
 * Token usage information
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens?: number;
}

// ============================================================================
// Turn Events
// ============================================================================

/**
 * TurnRequestEvent - Turn started (user message received)
 */
export interface TurnRequestEvent extends AgentTurnEventBase<"turn_request", {
  turnId: string;
  messageId: string;
  content: string;
  timestamp: number;
}> {}

/**
 * TurnResponseEvent - Turn completed (assistant response finished)
 */
export interface TurnResponseEvent extends AgentTurnEventBase<"turn_response", {
  turnId: string;
  messageId: string;
  duration: number;
  usage?: TokenUsage;
  model?: string;
  stopReason?: string;
  timestamp: number;
}> {}

// ============================================================================
// Union Type
// ============================================================================

/**
 * AgentTurnEvent - All turn events
 */
export type AgentTurnEvent = TurnRequestEvent | TurnResponseEvent;

/**
 * AgentTurnEventType - String literal union
 */
export type AgentTurnEventType = AgentTurnEvent["type"];

/**
 * Type guard: is this a turn event?
 */
export function isAgentTurnEvent(event: { source?: string; category?: string }): event is AgentTurnEvent {
  return event.source === "agent" && event.category === "turn";
}
